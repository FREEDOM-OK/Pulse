import { StyleSheet, View } from 'react-native';

import { GlassMaterial, type GlassScheme } from '@/constants/theme';

/**
 * 页根容器上的两团弥散光晕（环境光画布）。
 * pointerEvents="none"，只做视觉，不参与任何交互。
 */
export function GlassGlow({ scheme }: { scheme: GlassScheme }) {
  const material = GlassMaterial[scheme];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="glass-glow">
      <View style={[styles.primary, { backgroundColor: material.glowPrimary }]} />
      <View style={[styles.secondary, { backgroundColor: material.glowSecondary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    position: 'absolute',
    top: -90,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  secondary: {
    position: 'absolute',
    bottom: -110,
    right: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
});