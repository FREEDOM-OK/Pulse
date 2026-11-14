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

import {
  getAppSkin,
  getHomeBgColor,
  getHomeBgImage,
  getHomeBgMode,
  getTheme,
  setAppSkin as persistAppSkin,
  setHomeBgColor as persistHomeBgColor,
  setHomeBgImage as persistHomeBgImage,
  setHomeBgMode as persistHomeBgMode,
  setTheme as persistTheme,
  type ThemeSetting,
} from '@/db/repositories/settings';
import { DEFAULT_HOME_BG_COLOR, type AppSkin, type HomeBgMode } from '@/db/types';

interface ThemeContextValue {
  preference: ThemeSetting;
  scheme: 'light' | 'dark';
  setPreference: (value: ThemeSetting) => Promise<void>;
  /** 全局皮肤：经典极简 / 毛玻璃。 */
  skin: AppSkin;
  /** 是否处于毛玻璃皮肤（省得每个组件都写 skin === 'glass'）。 */
  glass: boolean;
  setAppSkin: (value: AppSkin) => Promise<void>;
  /** 首页背景：默认 / 纯色 / 图片。 */
  homeBgMode: HomeBgMode;
  homeBgColor: string;
  homeBgImage: string | null;
  setHomeBgMode: (value: HomeBgMode) => Promise<void>;
  setHomeBgColor: (value: string) => Promise<void>;
  setHomeBgImage: (value: string | null) => Promise<void>;
}

export const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);

/**
 * 外观偏好：主题（跟随系统/浅色/深色）、皮肤（经典/毛玻璃）、首页背景。
 * 全部存在 settings 表里；这里改状态会实时广播，切换皮肤不用重启 App。
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemeSetting>('system');
  const [skin, setSkinState] = useState<AppSkin>('default');
  const [homeBgMode, setHomeBgModeState] = useState<HomeBgMode>('default');
  const [homeBgColor, setHomeBgColorState] = useState(DEFAULT_HOME_BG_COLOR);
  const [homeBgImage, setHomeBgImageState] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTheme(), getAppSkin(), getHomeBgMode(), getHomeBgColor(), getHomeBgImage()])
      .then(([nextTheme, nextSkin, nextBgMode, nextBgColor, nextBgImage]) => {
        setPreferenceState(nextTheme);
        setSkinState(nextSkin);
        setHomeBgModeState(nextBgMode);
        setHomeBgColorState(nextBgColor);
        setHomeBgImageState(nextBgImage);
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback(async (value: ThemeSetting) => {
    setPreferenceState(value);
    await persistTheme(value);
  }, []);

  const setAppSkin = useCallback(async (value: AppSkin) => {
    setSkinState(value);
    await persistAppSkin(value);
  }, []);

  const setHomeBgMode = useCallback(async (value: HomeBgMode) => {
    setHomeBgModeState(value);
    await persistHomeBgMode(value);
  }, []);

  const setHomeBgColor = useCallback(async (value: string) => {
    setHomeBgColorState(value);
    await persistHomeBgColor(value);
  }, []);

  const setHomeBgImage = useCallback(async (value: string | null) => {
    setHomeBgImageState(value);
    await persistHomeBgImage(value);
  }, []);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({
      preference,
      scheme,
      setPreference,
      skin,
      glass: skin === 'glass',
      setAppSkin,
      homeBgMode,
      homeBgColor,
      homeBgImage,
      setHomeBgMode,
      setHomeBgColor,
      setHomeBgImage,
    }),
    [
      preference,
      scheme,
      setPreference,
      skin,
      setAppSkin,
      homeBgMode,
      homeBgColor,
      homeBgImage,
      setHomeBgMode,
      setHomeBgColor,
      setHomeBgImage,
    ]
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