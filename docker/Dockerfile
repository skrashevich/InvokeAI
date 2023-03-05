# syntax=docker/dockerfile:labs

ARG PYTHON_VERSION=3.9
##################
##  base image  ##
##################
FROM --platform=${TARGETPLATFORM} python:${PYTHON_VERSION}-slim AS python-base

LABEL org.opencontainers.image.authors="mauwii@outlook.de"

# Prepare apt for buildkit cache
RUN rm -f /etc/apt/apt.conf.d/docker-clean \
  && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' >/etc/apt/apt.conf.d/keep-cache

# Install dependencies
RUN \
  --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt-get update \
  && apt-get install -y \
    --no-install-recommends \
    libgl1-mesa-glx=20.3.* \
    libglib2.0-0=2.66.* \
    libopencv-dev=4.5.*

# Set working directory and env
ARG APPDIR=/usr/src
ARG APPNAME=InvokeAI
WORKDIR ${APPDIR}
ENV PATH ${APPDIR}/${APPNAME}/bin:$PATH
# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE 1
# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED 1
# Don't fall back to legacy build system
ENV PIP_USE_PEP517=1
# Allow pre-release packages
ENV PIP_PRE=1

FROM python-base AS xformers-builder
# Install build dependencies
RUN \
  --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt-get update \
  && apt-get install -y \
    --no-install-recommends \
    build-essential=12.9 \
    gcc=4:10.2.* \
    python3-dev=3.9.* \
    git wget

# Prepare pip for buildkit cache
ARG PIP_CACHE_DIR=/var/cache/buildkit/pip
ENV PIP_CACHE_DIR ${PIP_CACHE_DIR}
RUN mkdir -p ${PIP_CACHE_DIR}

ARG PIP_EXTRA_INDEX_URL
ENV PIP_EXTRA_INDEX_URL ${PIP_EXTRA_INDEX_URL}

ENV TORCH_CUDA_ARCH_LIST "6.1;8.6"

ARG CUDA_VERSION=11.7.1
ARG PLAT_NAME=manylinux2014_x86_64

RUN wget -q https://developer.download.nvidia.com/compute/cuda/$CUDA_VERSION/local_installers/cuda_${CUDA_VERSION}_515.65.01_linux.run -O cuda.run \
    && sh ./cuda.run --silent --toolkit \
    && rm ./cuda.run

RUN --mount=type=cache,target=${PIP_CACHE_DIR} pip3 install ninja setuptools numpy --pre torch torchvision torchaudio --force-reinstall
ADD https://github.com/facebookresearch/xformers.git /src
WORKDIR /src
RUN --mount=type=cache,target=${PIP_CACHE_DIR} <<EOT bash
sed -i '/torch/d' ./requirements.txt
echo $(pip3 show torch | grep Version | cut -d' ' -f2) >> ./requirements.txt
pip3 install -r requirements.txt
python3 setup.py bdist_wheel -d /wheels --plat-name $PLAT_NAME
EOT


#######################
##  build pyproject  ##
#######################
FROM python-base AS pyproject-builder

# Install build dependencies
RUN \
  --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt-get update \
  && apt-get install -y \
    --no-install-recommends \
    build-essential=12.9 \
    gcc=4:10.2.* \
    python3-dev=3.9.* \
    git

# Prepare pip for buildkit cache
ARG PIP_CACHE_DIR=/var/cache/buildkit/pip
ENV PIP_CACHE_DIR ${PIP_CACHE_DIR}
RUN mkdir -p ${PIP_CACHE_DIR}

# Create virtual environment
RUN --mount=type=cache,target=${PIP_CACHE_DIR} \
  python3 -m venv "${APPNAME}" \
  --upgrade-deps

# Install requirements
COPY --link pyproject.toml .
COPY --link invokeai/version invokeai/version
ARG PIP_EXTRA_INDEX_URL
ENV PIP_EXTRA_INDEX_URL ${PIP_EXTRA_INDEX_URL}
RUN --mount=type=bind,from=xformers-builder,source=/wheels,target=/wheels --mount=type=cache,target=${PIP_CACHE_DIR} \
  "${APPNAME}"/bin/pip install --find-links=/wheels .

# Install pyproject.toml
COPY --link . .
RUN --mount=type=bind,from=xformers-builder,source=/wheels,target=/wheels --mount=type=cache,target=${PIP_CACHE_DIR} \
  "${APPNAME}/bin/pip" install --find-links=/wheels .

# Build patchmatch
RUN python3 -c "from patchmatch import patch_match"

#####################
##  runtime image  ##
#####################
FROM python-base AS runtime

# Create a new user
ARG UNAME=appuser
ARG UID=1000
ARG GID=1000
RUN groupadd -o -g "${GID}" "${UNAME}" && useradd \
  --no-log-init \
  -m \
  -u ${UID} \
  -g ${GID} \
  "${UNAME}"

# Create volume directory
ARG VOLUME_DIR=/data
RUN mkdir -p "${VOLUME_DIR}" \
  && chown -hR "${UNAME}:${UNAME}" "${VOLUME_DIR}"

# Setup runtime environment
USER ${UNAME}:${UNAME}
COPY --chown=${UNAME}:${UNAME} --from=pyproject-builder ${APPDIR}/${APPNAME} ${APPNAME}
ENV INVOKEAI_ROOT ${VOLUME_DIR}
ENV TRANSFORMERS_CACHE ${VOLUME_DIR}/.cache
ENV INVOKE_MODEL_RECONFIGURE "--yes --default_only"
EXPOSE 9090
ENTRYPOINT [ "invokeai" ]
CMD [ "--web", "--host", "0.0.0.0", "--port", "9090" ]
VOLUME [ "${VOLUME_DIR}" ]
