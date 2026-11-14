import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { GlassGlow } from '@/components/ui/glass-glow';
import { useGlass, useTheme, useThemeMode } from '@/hooks/use-theme';
import { glassCardStyle } from '@/lib/glass';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** 页面根容器：毛玻璃皮肤下额外铺两团弥散光晕。 */
  glow?: boolean;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  glow = false,
  children,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();
  const scheme = useThemeMode();
  const glass = useGlass();
  // 毛玻璃皮肤下，所有「元素底」自动变成半透明磨砂卡片 + 镜面高光描边。
  // 页面根（无 type）仍是背景色，避免把环境光晕/弹窗一起染色。
  const glassCard = glass && type === 'backgroundElement';
  const showGlow = glass && glow;

  return (
    <View
      style={[
        { backgroundColor: theme[type ?? 'background'] },
        glassCard ? glassCardStyle(scheme) : null,
        style,
      ]}
      {...otherProps}>
      {showGlow ? <GlassGlow scheme={scheme} /> : null}
      {children}
    </View>
  );
}