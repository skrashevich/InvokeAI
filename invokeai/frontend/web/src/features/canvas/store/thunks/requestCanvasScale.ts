import { AppDispatch, AppGetState } from 'app/store';
import { activeTabNameSelector } from 'features/ui/store/uiSelectors';
import { debounce } from 'lodash';
import { setDoesCanvasNeedScaling } from '../canvasSlice';

const debouncedCanvasScale = debounce((dispatch: AppDispatch) => {
  dispatch(setDoesCanvasNeedScaling(true));
}, 300);

export const requestCanvasRescale =
  () => (dispatch: AppDispatch, getState: AppGetState) => {
    const activeTabName = activeTabNameSelector(getState());
    if (activeTabName === 'unifiedCanvas') {
      debouncedCanvasScale(dispatch);
    }
  };
