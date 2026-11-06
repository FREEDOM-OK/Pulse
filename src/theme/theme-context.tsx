import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { getTheme, setTheme as persistTheme, type ThemeSetting } from '@/db/repositories/settings';

interface ThemeContextValue {
  preference: ThemeSetting;
  scheme: 'light' | 'dark';
  setPreference: (value: ThemeSetting) => Promise<void>;
}

export const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);

/** 主题偏好：跟随系统 / 浅色 / 深色，持久化在 settings 表。 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemeSetting>('system');

  useEffect(() => {
    getTheme()
      .then(setPreferenceState)
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback(async (value: ThemeSetting) => {
    setPreferenceState(value);
    await persistTheme(value);
  }, []);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference 必须在 ThemePreferenceProvider 内使用');
  }
  return context;
}
