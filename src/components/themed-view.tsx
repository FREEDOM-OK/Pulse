import { View, type ViewProps } from 'react-native';

import { PageBackground } from '@/components/ui/page-background';
import { ThemeColor } from '@/constants/theme';
import { useGlass, useTheme, useThemeMode } from '@/hooks/use-theme';
import { glassCardStyle } from '@/lib/glass';
import { useThemePreference } from '@/theme/theme-context';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** 页面根容器：渲染全局页面背景（预设渐变 / 纯色 / 壁纸）。 */
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
  const { homeBgMode } = useThemePreference();
  // 毛玻璃皮肤下，所有「元素底」自动变成磨砂卡片 + 镜面高光描边。
  // 页面根（无 type）仍是背景色，避免把页面背景/弹窗一起染色。
  const glassCard = glass && type === 'backgroundElement';
  const showPageBg = glass || homeBgMode !== 'default';

  return (
    <View
      style={[
        // 毛玻璃卡片只用材质层这一份半透明底，避免叠两层半透明变「死白方块」。
        { backgroundColor: glassCard ? 'transparent' : theme[type ?? 'background'] },
        glassCard ? glassCardStyle(scheme) : null,
        style,
      ]}
      {...otherProps}>
      {glow && showPageBg ? <PageBackground /> : null}
      {children}
    </View>
  );
}