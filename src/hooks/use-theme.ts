import { useContext } from 'react';

import { Colors, GlassColors, GlassMaterial } from '@/constants/theme';
import type { GlassMaterialSpec } from '@/constants/theme';
import type { AppSkin } from '@/db/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreferenceContext } from '@/theme/theme-context';

/**
 * 主题色板：优先用用户手动选择，未选择时跟随系统。
 * 开了毛玻璃皮肤就整体换成 GlassColors，所有界面不用改代码。
 */
export function useTheme() {
  const systemScheme = useColorScheme();
  const context = useContext(ThemePreferenceContext);
  const scheme = context?.scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  return context?.skin === 'glass' ? GlassColors[scheme] : Colors[scheme];
}

export function useThemeMode(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const context = useContext(ThemePreferenceContext);
  return context?.scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
}

/** 当前全局皮肤；不在 Provider 内时按经典极简处理。 */
export function useSkin(): AppSkin {
  const context = useContext(ThemePreferenceContext);
  return context?.skin ?? 'default';
}

/** 是否毛玻璃皮肤，等价于 useSkin() === 'glass'，方便写条件样式。 */
export function useGlass(): boolean {
  return useSkin() === 'glass';
}

/** 当前明暗对应的玻璃材质数值（卡片/底栏/弹窗等）。 */
export function useGlassMaterial(): GlassMaterialSpec {
  return GlassMaterial[useThemeMode()];
}