import { ButtonGroup, Flex } from '@chakra-ui/react';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/storeHooks';
import IAIColorPicker from 'common/components/IAIColorPicker';
import IAIIconButton from 'common/components/IAIIconButton';
import IAIPopover from 'common/components/IAIPopover';
import IAISlider from 'common/components/IAISlider';
import {
  canvasSelector,
  isStagingSelector,
} from 'features/canvas/store/canvasSelectors';
import {
  addEraseRect,
  addFillRect,
  setBrushColor,
  setBrushSize,
  setTool,
} from 'features/canvas/store/canvasSlice';
import { systemSelector } from 'features/system/store/systemSelectors';
import { clamp, isEqual } from 'lodash';

import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';
import {
  FaEraser,
  FaEyeDropper,
  FaFillDrip,
  FaPaintBrush,
  FaPlus,
  FaSlidersH,
} from 'react-icons/fa';

export const selector = createSelector(
  [canvasSelector, isStagingSelector, systemSelector],
  (canvas, isStaging, system) => {
    const { isProcessing } = system;
    const { tool, brushColor, brushSize } = canvas;

    return {
      tool,
      isStaging,
      isProcessing,
      brushColor,
      brushSize,
    };
  },
  {
    memoizeOptions: {
      resultEqualityCheck: isEqual,
    },
  }
);

const IAICanvasToolChooserOptions = () => {
  const dispatch = useAppDispatch();
  const { tool, brushColor, brushSize, isStaging } = useAppSelector(selector);
  const { t } = useTranslation();

  useHotkeys(
    ['b'],
    () => {
      handleSelectBrushTool();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    []
  );

  useHotkeys(
    ['e'],
    () => {
      handleSelectEraserTool();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    [tool]
  );

  useHotkeys(
    ['c'],
    () => {
      handleSelectColorPickerTool();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    [tool]
  );

  useHotkeys(
    ['shift+f'],
    () => {
      handleFillRect();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    }
  );

  useHotkeys(
    ['delete', 'backspace'],
    () => {
      handleEraseBoundingBox();
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    }
  );

  useHotkeys(
    ['BracketLeft'],
    () => {
      dispatch(setBrushSize(Math.max(brushSize - 5, 5)));
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    [brushSize]
  );

  useHotkeys(
    ['BracketRight'],
    () => {
      dispatch(setBrushSize(Math.min(brushSize + 5, 500)));
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    [brushSize]
  );

  useHotkeys(
    ['shift+BracketLeft'],
    () => {
      dispatch(
        setBrushColor({
          ...brushColor,
          a: clamp(brushColor.a - 0.05, 0.05, 1),
        })
      );
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    [brushColor]
  );

  useHotkeys(
    ['shift+BracketRight'],
    () => {
      dispatch(
        setBrushColor({
          ...brushColor,
          a: clamp(brushColor.a + 0.05, 0.05, 1),
        })
      );
    },
    {
      enabled: () => !isStaging,
      preventDefault: true,
    },
    [brushColor]
  );

  const handleSelectBrushTool = () => dispatch(setTool('brush'));
  const handleSelectEraserTool = () => dispatch(setTool('eraser'));
  const handleSelectColorPickerTool = () => dispatch(setTool('colorPicker'));
  const handleFillRect = () => dispatch(addFillRect());
  const handleEraseBoundingBox = () => dispatch(addEraseRect());

  return (
    <ButtonGroup isAttached>
      <IAIIconButton
        aria-label={`${t('unifiedcanvas:brush')} (B)`}
        tooltip={`${t('unifiedcanvas:brush')} (B)`}
        icon={<FaPaintBrush />}
        data-selected={tool === 'brush' && !isStaging}
        onClick={handleSelectBrushTool}
        isDisabled={isStaging}
      />
      <IAIIconButton
        aria-label={`${t('unifiedcanvas:eraser')} (E)`}
        tooltip={`${t('unifiedcanvas:eraser')} (E)`}
        icon={<FaEraser />}
        data-selected={tool === 'eraser' && !isStaging}
        isDisabled={isStaging}
        onClick={handleSelectEraserTool}
      />
      <IAIIconButton
        aria-label={`${t('unifiedcanvas:fillBoundingBox')} (Shift+F)`}
        tooltip={`${t('unifiedcanvas:fillBoundingBox')} (Shift+F)`}
        icon={<FaFillDrip />}
        isDisabled={isStaging}
        onClick={handleFillRect}
      />
      <IAIIconButton
        aria-label={`${t('unifiedcanvas:eraseBoundingBox')} (Del/Backspace)`}
        tooltip={`${t('unifiedcanvas:eraseBoundingBox')} (Del/Backspace)`}
        icon={<FaPlus style={{ transform: 'rotate(45deg)' }} />}
        isDisabled={isStaging}
        onClick={handleEraseBoundingBox}
      />
      <IAIIconButton
        aria-label={`${t('unifiedcanvas:colorPicker')} (C)`}
        tooltip={`${t('unifiedcanvas:colorPicker')} (C)`}
        icon={<FaEyeDropper />}
        data-selected={tool === 'colorPicker' && !isStaging}
        isDisabled={isStaging}
        onClick={handleSelectColorPickerTool}
      />
      <IAIPopover
        trigger="hover"
        triggerComponent={
          <IAIIconButton
            aria-label={t('unifiedcanvas:brushOptions')}
            tooltip={t('unifiedcanvas:brushOptions')}
            icon={<FaSlidersH />}
          />
        }
      >
        <Flex minWidth="15rem" direction="column" gap="1rem" width="100%">
          <Flex gap="1rem" justifyContent="space-between">
            <IAISlider
              label={t('unifiedcanvas:brushSize')}
              value={brushSize}
              withInput
              onChange={(newSize) => dispatch(setBrushSize(newSize))}
              sliderNumberInputProps={{ max: 500 }}
              inputReadOnly={false}
            />
          </Flex>
          <IAIColorPicker
            style={{
              width: '100%',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
            }}
            color={brushColor}
            onChange={(newColor) => dispatch(setBrushColor(newColor))}
          />
        </Flex>
      </IAIPopover>
    </ButtonGroup>
  );
};

export default IAICanvasToolChooserOptions;
