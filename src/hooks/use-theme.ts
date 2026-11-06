import { useContext } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreferenceContext } from '@/theme/theme-context';

/** 主题颜色：优先用用户手动选择，未选择时跟随系统。 */
export function useTheme() {
  const systemScheme = useColorScheme();
  const context = useContext(ThemePreferenceContext);
  const scheme = context?.scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  return Colors[scheme];
}

export function useThemeMode(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const context = useContext(ThemePreferenceContext);
  return context?.scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
}
