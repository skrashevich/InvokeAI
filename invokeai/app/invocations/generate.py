# Copyright (c) 2022 Kyle Schouviller (https://github.com/kyle0654)

from functools import partial
from typing import Literal, Optional, Union

import numpy as np
from torch import Tensor

from pydantic import BaseModel, Field

from invokeai.app.models.image import ImageField, ImageType
from invokeai.app.invocations.util.get_model import choose_model
from .baseinvocation import BaseInvocation, InvocationContext, InvocationConfig
from .image import ImageOutput
from ...backend.generator import Txt2Img, Img2Img, Inpaint, InvokeAIGenerator
from ...backend.stable_diffusion import PipelineIntermediateState
from ..models.exceptions import CanceledException
from ..util.step_callback import diffusers_step_callback_adapter

SAMPLER_NAME_VALUES = Literal[tuple(InvokeAIGenerator.schedulers())]


class SDImageInvocation(BaseModel):
    """Helper class to provide all Stable Diffusion raster image invocations with additional config"""

    # Schema customisation
    class Config(InvocationConfig):
        schema_extra = {
            "ui": {
                "tags": ["stable-diffusion", "image"],
                "type_hints": {
                    "model": "model",
                },
            },
        }


# Text to image
class TextToImageInvocation(BaseInvocation, SDImageInvocation):
    """Generates an image using text2img."""

    type: Literal["txt2img"] = "txt2img"

    # Inputs
    # TODO: consider making prompt optional to enable providing prompt through a link
    # fmt: off
    prompt: Optional[str] = Field(description="The prompt to generate an image from")
    seed:        int = Field(default=-1,ge=-1, le=np.iinfo(np.uint32).max, description="The seed to use (-1 for a random seed)", )
    steps:       int = Field(default=10, gt=0, description="The number of steps to use to generate the image")
    width:       int = Field(default=512, multiple_of=64, gt=0, description="The width of the resulting image", )
    height:      int = Field(default=512, multiple_of=64, gt=0, description="The height of the resulting image", )
    cfg_scale: float = Field(default=7.5, gt=0, description="The Classifier-Free Guidance, higher values may result in a result closer to the prompt", )
    scheduler: SAMPLER_NAME_VALUES = Field(default="k_lms", description="The scheduler to use" )
    seamless:   bool = Field(default=False, description="Whether or not to generate an image that can tile without seams", )
    model:       str = Field(default="", description="The model to use (currently ignored)")
    progress_images: bool = Field(default=False, description="Whether or not to produce progress images during generation",  )
    # fmt: on

    # TODO: pass this an emitter method or something? or a session for dispatching?
    def dispatch_progress(
        self, context: InvocationContext, intermediate_state: PipelineIntermediateState
    ) -> None:
        if (context.services.queue.is_canceled(context.graph_execution_state_id)):
            raise CanceledException

        step = intermediate_state.step
        if intermediate_state.predicted_original is not None:
            # Some schedulers report not only the noisy latents at the current timestep,
            # but also their estimate so far of what the de-noised latents will be.
            sample = intermediate_state.predicted_original
        else:
            sample = intermediate_state.latents
        
        diffusers_step_callback_adapter(sample, step, steps=self.steps, id=self.id, context=context)

    def invoke(self, context: InvocationContext) -> ImageOutput:
        # Handle invalid model parameter
        model = choose_model(context.services.model_manager, self.model)

        outputs = Txt2Img(model).generate(
            prompt=self.prompt,
            step_callback=partial(self.dispatch_progress, context),
            **self.dict(
                exclude={"prompt"}
            ),  # Shorthand for passing all of the parameters above manually
        )
        # Outputs is an infinite iterator that will return a new InvokeAIGeneratorOutput object
        # each time it is called. We only need the first one.
        generate_output = next(outputs)

        # Results are image and seed, unwrap for now and ignore the seed
        # TODO: pre-seed?
        # TODO: can this return multiple results? Should it?
        image_type = ImageType.RESULT
        image_name = context.services.images.create_name(
            context.graph_execution_state_id, self.id
        )
        context.services.images.save(image_type, image_name, generate_output.image)
        return ImageOutput(
            image=ImageField(image_type=image_type, image_name=image_name)
        )


class ImageToImageInvocation(TextToImageInvocation):
    """Generates an image using img2img."""

    type: Literal["img2img"] = "img2img"

    # Inputs
    image: Union[ImageField, None] = Field(description="The input image")
    strength: float = Field(
        default=0.75, gt=0, le=1, description="The strength of the original image"
    )
    fit: bool = Field(
        default=True,
        description="Whether or not the result should be fit to the aspect ratio of the input image",
    )

    def dispatch_progress(
        self, context: InvocationContext, intermediate_state: PipelineIntermediateState
    ) -> None:  
        if (context.services.queue.is_canceled(context.graph_execution_state_id)):
            raise CanceledException

        step = intermediate_state.step
        if intermediate_state.predicted_original is not None:
            # Some schedulers report not only the noisy latents at the current timestep,
            # but also their estimate so far of what the de-noised latents will be.
            sample = intermediate_state.predicted_original
        else:
            sample = intermediate_state.latents

        diffusers_step_callback_adapter(sample, step, steps=self.steps, id=self.id, context=context)

    def invoke(self, context: InvocationContext) -> ImageOutput:
        image = (
            None
            if self.image is None
            else context.services.images.get(
                self.image.image_type, self.image.image_name
            )
        )
        mask = None

        # Handle invalid model parameter
        model = choose_model(context.services.model_manager, self.model)

        outputs = Img2Img(model).generate(
                prompt=self.prompt,
                init_image=image,
                init_mask=mask,
                step_callback=partial(self.dispatch_progress, context),
                **self.dict(
                    exclude={"prompt", "image", "mask"}
                ),  # Shorthand for passing all of the parameters above manually
            )

        # Outputs is an infinite iterator that will return a new InvokeAIGeneratorOutput object
        # each time it is called. We only need the first one.
        generator_output = next(outputs)

        result_image = generator_output.image

        # Results are image and seed, unwrap for now and ignore the seed
        # TODO: pre-seed?
        # TODO: can this return multiple results? Should it?
        image_type = ImageType.RESULT
        image_name = context.services.images.create_name(
            context.graph_execution_state_id, self.id
        )
        context.services.images.save(image_type, image_name, result_image)
        return ImageOutput(
            image=ImageField(image_type=image_type, image_name=image_name)
        )

class InpaintInvocation(ImageToImageInvocation):
    """Generates an image using inpaint."""

    type: Literal["inpaint"] = "inpaint"

    # Inputs
    mask: Union[ImageField, None] = Field(description="The mask")
    inpaint_replace: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="The amount by which to replace masked areas with latent noise",
    )

    def dispatch_progress(
        self, context: InvocationContext, intermediate_state: PipelineIntermediateState
    ) -> None:  
        if (context.services.queue.is_canceled(context.graph_execution_state_id)):
            raise CanceledException

        step = intermediate_state.step
        if intermediate_state.predicted_original is not None:
            # Some schedulers report not only the noisy latents at the current timestep,
            # but also their estimate so far of what the de-noised latents will be.
            sample = intermediate_state.predicted_original
        else:
            sample = intermediate_state.latents

        diffusers_step_callback_adapter(sample, step, steps=self.steps, id=self.id, context=context)

    def invoke(self, context: InvocationContext) -> ImageOutput:
        image = (
            None
            if self.image is None
            else context.services.images.get(
                self.image.image_type, self.image.image_name
            )
        )
        mask = (
            None
            if self.mask is None
            else context.services.images.get(self.mask.image_type, self.mask.image_name)
        )

        # Handle invalid model parameter
        model = choose_model(context.services.model_manager, self.model)   

        outputs = Inpaint(model).generate(
                prompt=self.prompt,
                init_img=image,
                init_mask=mask,
                step_callback=partial(self.dispatch_progress, context),
                **self.dict(
                    exclude={"prompt", "image", "mask"}
                ),  # Shorthand for passing all of the parameters above manually
            )

        # Outputs is an infinite iterator that will return a new InvokeAIGeneratorOutput object
        # each time it is called. We only need the first one.
        generator_output = next(outputs)

        result_image = generator_output.image

        # Results are image and seed, unwrap for now and ignore the seed
        # TODO: pre-seed?
        # TODO: can this return multiple results? Should it?
        image_type = ImageType.RESULT
        image_name = context.services.images.create_name(
            context.graph_execution_state_id, self.id
        )
        context.services.images.save(image_type, image_name, result_image)
        return ImageOutput(
            image=ImageField(image_type=image_type, image_name=image_name)
        )
