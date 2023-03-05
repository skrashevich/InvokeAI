import { HStack } from '@chakra-ui/react';
import { NUMPY_RAND_MAX, NUMPY_RAND_MIN } from 'app/constants';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/storeHooks';
import IAINumberInput from 'common/components/IAINumberInput';
import { setSeed } from 'features/parameters/store/generationSlice';
import { useTranslation } from 'react-i18next';
import ShuffleSeed from './ShuffleSeed';

export default function Seed() {
  const seed = useAppSelector((state: RootState) => state.generation.seed);
  const shouldRandomizeSeed = useAppSelector(
    (state: RootState) => state.generation.shouldRandomizeSeed
  );
  const shouldGenerateVariations = useAppSelector(
    (state: RootState) => state.generation.shouldGenerateVariations
  );

  const { t } = useTranslation();

  const dispatch = useAppDispatch();

  const handleChangeSeed = (v: number) => dispatch(setSeed(v));

  return (
    <HStack gap={2}>
      <IAINumberInput
        label={t('parameters.seed')}
        step={1}
        precision={0}
        flexGrow={1}
        min={NUMPY_RAND_MIN}
        max={NUMPY_RAND_MAX}
        isDisabled={shouldRandomizeSeed}
        isInvalid={seed < 0 && shouldGenerateVariations}
        onChange={handleChangeSeed}
        value={seed}
        formControlProps={{
          display: 'flex',
          alignItems: 'center',
          gap: 3, // really this should work with 2 but seems to need to be 3 to match gap 2?
        }}
      />
      <ShuffleSeed />
    </HStack>
  );
}
