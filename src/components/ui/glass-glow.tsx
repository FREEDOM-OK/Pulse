import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { GlassScheme } from '@/constants/theme';

/** 同心羽化层数：每层透明度极低，叠出没有硬边的弥散光。 */
const RING_COUNT = 10;
/** 相邻两层的半径收缩比例（1 → 0.28）。 */
const RING_STEP = 0.08;

const GLOW_COLORS: Record<'primary' | 'secondary', { light: string; dark: string }> = {
  primary: { light: '#93C5FD', dark: '#60A5FA' },
  secondary: { light: '#DDD6FE', dark: '#818CF8' },
};

const RING_OPACITY: Record<GlassScheme, number> = {
  light: 0.012,
  dark: 0.008,
};

interface AuraProps {
  tone: 'primary' | 'secondary';
  scheme: GlassScheme;
  size: number;
  style: StyleProp<ViewStyle>;
}

/**
 * 一团羽化环境光：10 个从大到小叠加的极淡同心圆。
 * RN 的普通 View 没有高斯模糊，单层实心圆会变成生硬的「圆饼贴纸」；
 * 每层只用 0.8%~1.2% 透明度，叠加后中心柔和、边缘自然衰减到 0。
 */
function Aura({ tone, scheme, size, style }: AuraProps) {
  const color = GLOW_COLORS[tone][scheme];
  const opacity = RING_OPACITY[scheme];
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      {Array.from({ length: RING_COUNT }, (_, index) => {
        const ringSize = size * (1 - index * RING_STEP);
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              backgroundColor: color,
              opacity,
              left: (size - ringSize) / 2,
              top: (size - ringSize) / 2,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * 页根容器上的两团弥散光晕（环境光画布）。
 * pointerEvents="none"，只做视觉，不参与任何交互。
 */
export function GlassGlow({ scheme }: { scheme: GlassScheme }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="glass-glow">
      <Aura tone="primary" scheme={scheme} size={300} style={styles.primary} />
      <Aura tone="secondary" scheme={scheme} size={340} style={styles.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    top: -100,
    left: -100,
  },
  secondary: {
    bottom: -120,
    right: -100,
  },
});