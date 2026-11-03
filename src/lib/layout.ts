import { useWindowDimensions } from 'react-native';

/** Width from which two columns and a side tab bar are used (landscape tablets, large foldables). */
export const WIDE_WIDTH = 900;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isWide: width >= WIDE_WIDTH,
    /** Phones in landscape are short but not tablets; judge by the shorter side. */
    isTablet: Math.min(width, height) >= 600,
    /** Widest a single column of content gets before it is centered with margins */
    contentMax: width >= WIDE_WIDTH ? 1100 : 900,
  };
}
