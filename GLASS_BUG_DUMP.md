# GLASS_BUG_DUMP — 毛玻璃皮肤相关源码全量导出

> 用途：定位 Android 真机上的 4 个渲染异常（双层套娃卡片 / 光晕硬边 / 底栏无模糊 / 我的页头像与标题错位）。
> 本文件为源码原样导出，未做任何修改。生成时间：2026-11-14（Asia/Shanghai）。

## 文件清单

- `src/components/themed-view.tsx`（45 行）
- `src/components/ui/glass-glow.tsx`（36 行）
- `src/lib/glass.ts`（60 行）
- `src/theme/theme-context.tsx`（138 行）
- `src/constants/theme.ts`（218 行）
- `src/components/nav/app-tab-bar.tsx`（432 行）
- `src/app/(tabs)/index.tsx`（649 行）
- `src/app/(tabs)/settings.tsx`（890 行）
- `src/app/personalize/index.tsx`（400 行）

## `src/components/themed-view.tsx`

行数：45（末尾换行按原文保留）

````tsx
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
````

## `src/components/ui/glass-glow.tsx`

行数：36（末尾换行按原文保留）

````tsx
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
````

## `src/lib/glass.ts`

行数：60（末尾换行按原文保留）

````tsx
import type { ViewStyle } from 'react-native';

import { GlassMaterial, type GlassScheme } from '@/constants/theme';

/**
 * 苹果毛玻璃的通用样式工厂。
 * 只返回视觉属性，圆角/尺寸仍由各组件自己的样式决定，避免覆盖布局。
 */

/** 卡片磨砂表面：半透明底 + 镜面高光描边 + 柔和弥散底光。 */
export function glassCardStyle(scheme: GlassScheme): ViewStyle {
  const material = GlassMaterial[scheme];
  return {
    backgroundColor: material.card,
    borderWidth: 0.8,
    borderColor: material.cardBorder,
    shadowColor: material.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: material.cardShadowOpacity,
    shadowRadius: 18,
    elevation: material.cardElevation,
  };
}

/** 底栏胶囊：高透悬浮灵动岛。 */
export function glassBarStyle(scheme: GlassScheme): ViewStyle {
  const material = GlassMaterial[scheme];
  return {
    backgroundColor: material.bar,
    borderWidth: 1,
    borderColor: material.barBorder,
  };
}

/** 弹窗面板：浓度更高的磨砂玻璃 + 顶部亮白高光边。 */
export function glassSheetStyle(scheme: GlassScheme): ViewStyle {
  const material = GlassMaterial[scheme];
  return {
    backgroundColor: material.sheet,
    borderWidth: 1,
    borderColor: material.sheetBorder,
    borderTopWidth: 1,
    borderTopColor: scheme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.22)',
    shadowColor: material.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: scheme === 'light' ? 0.12 : 0.4,
    shadowRadius: 28,
    elevation: 8,
  };
}

/** 卡片内的小玻璃块：健身组数框、游戏分段器、课表表头等。 */
export function glassBlockStyle(scheme: GlassScheme): ViewStyle {
  const material = GlassMaterial[scheme];
  return {
    backgroundColor: material.block,
    borderWidth: 0.8,
    borderColor: material.blockBorder,
  };
}
````

## `src/theme/theme-context.tsx`

行数：138（末尾换行按原文保留）

````tsx
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
  /** 全局皮肤：经典极简 / 苹果毛玻璃。 */
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
````

## `src/constants/theme.ts`

行数：219（末尾换行按原文保留）

````tsx
/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** 一套主题色板：经典极简用 Colors，苹果毛玻璃用 GlassColors，键完全一致。 */
export type ThemePalette = { [K in ThemeColor]: string };

/**
 * 苹果毛玻璃（Apple Glass）色板。
 *
 * 只覆盖主题色：底层环境光画布不再是死板纯色，卡片/选中态换成半透明材质，
 * 这样所有用 useTheme() 的界面不用改代码就能一起切过去。
 */
export const GlassColors = {
  light: {
    text: '#0B1220',
    background: '#EEF2F7',
    backgroundElement: 'rgba(255, 255, 255, 0.65)',
    backgroundSelected: 'rgba(0, 0, 0, 0.06)',
    textSecondary: '#5F6673',
  },
  dark: {
    text: '#F5F7FC',
    background: '#0B0D13',
    backgroundElement: 'rgba(32, 34, 42, 0.62)',
    backgroundSelected: 'rgba(255, 255, 255, 0.12)',
    textSecondary: '#9AA2B1',
  },
} as const;

export type GlassScheme = 'light' | 'dark';

export interface GlassMaterialSpec {
  /** 页面根背景（环境光画布）。 */
  canvas: string;
  /** 卡片磨砂表面。 */
  card: string;
  cardBorder: string;
  cardShadow: string;
  cardShadowOpacity: number;
  cardElevation: number;
  /** 底栏悬浮胶囊。 */
  bar: string;
  barBorder: string;
  barIndicator: string;
  /** 弹窗面板（浓度更高）。 */
  sheet: string;
  sheetBorder: string;
  /** 根容器四角的弥散光晕。 */
  glowPrimary: string;
  glowSecondary: string;
  /** 自定义壁纸上的柔光蒙版。 */
  imageOverlay: string;
  /** 卡片内部分隔线 / 细高光边。 */
  hairline: string;
  block: string;
  blockBorder: string;
}

/** 玻璃材质的数值配方，浅色/深色两套。 */
export const GlassMaterial: Record<GlassScheme, GlassMaterialSpec> = {
  light: {
    canvas: '#EEF2F7',
    card: 'rgba(255, 255, 255, 0.65)',
    cardBorder: 'rgba(255, 255, 255, 0.85)',
    cardShadow: '#0F172A',
    cardShadowOpacity: 0.05,
    cardElevation: 2,
    bar: 'rgba(255, 255, 255, 0.72)',
    barBorder: 'rgba(255, 255, 255, 0.9)',
    barIndicator: 'rgba(0, 0, 0, 0.06)',
    sheet: 'rgba(250, 250, 252, 0.88)',
    sheetBorder: 'rgba(255, 255, 255, 0.9)',
    glowPrimary: 'rgba(147, 197, 253, 0.22)',
    glowSecondary: 'rgba(249, 168, 212, 0.18)',
    imageOverlay: 'rgba(255, 255, 255, 0.18)',
    hairline: 'rgba(15, 23, 42, 0.08)',
    block: 'rgba(255, 255, 255, 0.55)',
    blockBorder: 'rgba(255, 255, 255, 0.45)',
  },
  dark: {
    canvas: '#0B0D13',
    card: 'rgba(32, 34, 42, 0.62)',
    cardBorder: 'rgba(255, 255, 255, 0.14)',
    cardShadow: '#000000',
    cardShadowOpacity: 0.28,
    cardElevation: 0,
    bar: 'rgba(28, 30, 36, 0.72)',
    barBorder: 'rgba(255, 255, 255, 0.16)',
    barIndicator: 'rgba(255, 255, 255, 0.12)',
    sheet: 'rgba(30, 32, 38, 0.88)',
    sheetBorder: 'rgba(255, 255, 255, 0.18)',
    glowPrimary: 'rgba(59, 130, 246, 0.12)',
    glowSecondary: 'rgba(129, 140, 248, 0.1)',
    imageOverlay: 'rgba(0, 0, 0, 0.35)',
    hairline: 'rgba(255, 255, 255, 0.1)',
    block: 'rgba(255, 255, 255, 0.08)',
    blockBorder: 'rgba(255, 255, 255, 0.18)',
  },
};

/** 日历回顾的模块颜色（PRDv1.1 第 2.3 节）：计划蓝 / 健身橙 / 事件绿 / 游戏紫。 */
export const ModuleColors = {
  tasks: '#4C8DF6',
  fitness: '#F2994A',
  events: '#4CAF7D',
  games: '#9B6DF3',
} as const;

export type ModuleKey = keyof typeof ModuleColors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** v1.2.2 起的新间距刻度：一律 8 的倍数。 */
export const Space = {
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 48,
} as const;

/** 字号与行高，行高统一取 1.5 倍（PRDv1.2.2 第 5 节）。 */
export const Type = {
  display: { fontSize: 28, lineHeight: 42, fontWeight: '800' },
  section: { fontSize: 22, lineHeight: 33, fontWeight: '700' },
  row: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 17, fontWeight: '500' },
} as const;

export type TypeToken = keyof typeof Type;

/** 动效时长（毫秒）。减弱动效时统一归零，由 hook 处理。 */
export const Motion = {
  enter: 250,
  move: 300,
  check: 200,
  ripple: 200,
} as const;

/**
 * Dash 卡片尺寸（PRD_module 第 8.1 节）：宽度固定 264，高度按黄金比算 → 427。
 * 卡片改成竖版，所以高度不再写死，统一用 `dashCardHeight()` 由宽度推出来。
 */
export const DashCardSize = {
  width: 264,
  gap: 16,
} as const;

/** 竖卡宽高比：高 = 宽 × 1.618。 */
export const DASH_CARD_RATIO = 1.618;

/** 由宽度算卡片高度：264 → 427。 */
export function dashCardHeight(width: number): number {
  return Math.round(width * DASH_CARD_RATIO);
}
````

## `src/components/nav/app-tab-bar.tsx`

行数：432（末尾换行按原文保留）

````tsx
/**
 * 悬浮胶囊底部导航：4 个真实 Tab + 中间「新建」按钮，共 5 个平级槽位。
 *
 * 视觉规格（用户 2026-11-11 指定）：
 * - 底座 66dp 高、33dp 圆角、纯白 #FFFFFF，左右各留 20dp；
 * - 绝对悬浮在屏幕底部，距底 20dp，并叠加 useSafeAreaInsets().bottom；
 * - 每个入口点击区 56×56，全部包在底座内，任何按钮都不凸出；
 * - 中间加号是 42dp 黑底白 + 的实心圆，放在自己的 56dp 槽位里；
 * - 选中态是 52×46、圆角 23 的 #F2F2F7 背景块，用 250ms 贝塞尔时序横滑。
 */

import { SymbolView } from 'expo-symbols';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventForm } from '@/components/home/event-form';
import { TaskForm } from '@/components/today/task-form';
import { ActionMenu } from '@/components/ui/action-menu';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import { buildTabItems, type TabItem } from '@/constants/tabs';
import type { MiddleTab } from '@/db/types';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useGlass, useGlassMaterial, useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import { bumpDataVersion } from '@/lib/data-version';
import { todayStr } from '@/lib/date';

const BAR_HEIGHT = 66;
const BAR_RADIUS = 33;
const BOTTOM_GAP = 20;
const TAB_SIZE = 56;
const SLOT_COUNT = 5;
const INDICATOR_WIDTH = 52;
const INDICATOR_HEIGHT = 46;
const INDICATOR_RADIUS = 23;
const PLUS_CIRCLE_SIZE = 42;
const ICON_SIZE = 22;

const NAV_BACKGROUND_LIGHT = '#FFFFFF';
const NAV_BACKGROUND_DARK = '#1C1C1E';
const INDICATOR_COLOR_LIGHT = '#F2F2F7';
const ACTIVE_COLOR_LIGHT = '#000000';
const INACTIVE_COLOR_LIGHT = '#8E8E93';
const PLUS_BACKGROUND_LIGHT = '#000000';
const PLUS_FOREGROUND_LIGHT = '#FFFFFF';

/** 5 个视觉槽位里，真实路由 Tab 占 0/1/3/4，槽位 2 留给加号。 */
const SLOT_INDEX = [0, 1, 3, 4] as const;

/**
 * 首版弹簧在阻尼较高时仍有约 500ms 的拖尾，因此按用户给的备选方案
 * 改用 Apple 风格的 250ms 贝塞尔时序：指哪打哪、不过冲、停得干净。
 */
const INDICATOR_TIMING = {
  duration: 250,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

/** 等距布局下，某个槽位的左边缘（Tab 点击区宽 56）。 */
function slotLeft(slot: number, barWidth: number): number {
  const gap = Math.max(0, (barWidth - TAB_SIZE * SLOT_COUNT) / (SLOT_COUNT + 1));
  return gap + slot * (TAB_SIZE + gap);
}

/** 指示器比点击区窄 4dp，平移时要在槽内水平居中。 */
function indicatorLeft(slot: number, barWidth: number): number {
  return slotLeft(slot, barWidth) + (TAB_SIZE - INDICATOR_WIDTH) / 2;
}

interface AppTabBarProps extends BottomTabBarProps {
  middle: MiddleTab;
}

export function AppTabBar({ state, emitter, navigateToTab, middle }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const glass = useGlass();
  const material = useGlassMaterial();
  const isDark = scheme === 'dark';
  // 毛玻璃皮肤：高透悬浮灵动岛胶囊；经典皮肤保持原来的纯色底栏。
  const navBackground = glass
    ? material.bar
    : isDark
      ? NAV_BACKGROUND_DARK
      : NAV_BACKGROUND_LIGHT;
  const barBorderWidth = glass ? 1 : isDark ? StyleSheet.hairlineWidth : 0;
  const barBorderColor = glass ? material.barBorder : 'rgba(255,255,255,0.12)';
  const indicatorColor = glass
    ? material.barIndicator
    : isDark
      ? theme.backgroundSelected
      : INDICATOR_COLOR_LIGHT;
  // 深色下反色：白底加号 + 黑加号，和浅色模式的黑底白加号保持同样的对比度。
  const plusBackground = isDark ? theme.text : PLUS_BACKGROUND_LIGHT;
  const plusForeground = isDark ? theme.background : PLUS_FOREGROUND_LIGHT;
  const [menuOpen, setMenuOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [today] = useState(() => todayStr());
  const [barWidth, setBarWidth] = useState(0);

  const tabs = buildTabItems(middle);
  const activeName = state.routes[state.index]?.name;

  const isActive = (tab: TabItem) => tab.name === activeName;

  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => isActive(tab)),
  );
  const activeSlot = SLOT_INDEX[activeTabIndex] ?? 0;

  const indicatorX = useSharedValue(0);
  const previousSlot = useRef<number | null>(null);

  /** 初始布局与横竖屏切换直接落位，只有 activeSlot 变化才播放滑动动画。 */
  const handleBarLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width <= 0 || Math.abs(width - barWidth) < 0.5) return;
    indicatorX.value = indicatorLeft(activeSlot, width);
    previousSlot.current = activeSlot;
    setBarWidth(width);
  };

  useEffect(() => {
    if (barWidth <= 0) return;

    const target = indicatorLeft(activeSlot, barWidth);
    const slotChanged = previousSlot.current !== activeSlot;
    previousSlot.current = activeSlot;

    if (!slotChanged || reduced) {
      indicatorX.value = target;
      return;
    }

    indicatorX.value = withTiming(target, INDICATOR_TIMING);
  }, [activeSlot, barWidth, indicatorX, reduced]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleTabPress = (tab: TabItem) => {
    const route = state.routes.find((item) => item.name === tab.name);
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (tab.name !== activeName && !event.defaultPrevented) {
      navigateToTab(route.key);
    }
  };

  const renderTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return null;
    return (
      <TabButton
        key={`${tab.name}-${middle}`}
        tab={tab}
        active={isActive(tab)}
        reduced={reduced}
        onPress={() => handleTabPress(tab)}
      />
    );
  };

  const menuItems = [
    {
      key: 'entry',
      label: '新建任务/备忘',
      onPress: () => {
        setMenuOpen(false);
        setTaskOpen(true);
      },
    },
    {
      key: 'event',
      label: '记事件',
      onPress: () => {
        setMenuOpen(false);
        setEventOpen(true);
      },
    },
  ];

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.dock, { paddingBottom: BOTTOM_GAP + insets.bottom }]}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: navBackground,
              borderWidth: barBorderWidth,
              borderColor: barBorderColor,
            },
          ]}
          onLayout={handleBarLayout}>
          {barWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicator, indicatorStyle, { backgroundColor: indicatorColor }]}
            />
          ) : null}

          {renderTab(0)}
          {renderTab(1)}

          <RipplePressable
            accessibilityRole="button"
            accessibilityLabel="新建"
            onPress={() => setMenuOpen(true)}
            rippleColor={isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)'}
            rippleRadius={PLUS_CIRCLE_SIZE / 2}
            style={styles.plusHit}
            contentStyle={styles.plusContent}>
            <View style={[styles.plusCircle, { backgroundColor: plusBackground }]}>
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                tintColor={plusForeground}
                size={24}
              />
            </View>
          </RipplePressable>

          {renderTab(2)}
          {renderTab(3)}
        </View>
      </View>

      <ActionMenu
        visible={menuOpen}
        title="新建"
        items={menuItems}
        onClose={() => setMenuOpen(false)}
      />

      <TaskForm
        visible={taskOpen}
        date={today}
        task={null}
        initialKind="task"
        onClose={() => setTaskOpen(false)}
        onSaved={() => {
          setTaskOpen(false);
          bumpDataVersion();
        }}
      />

      <EventForm
        visible={eventOpen}
        initialType="expense"
        onClose={() => setEventOpen(false)}
        onSaved={() => {
          setEventOpen(false);
          bumpDataVersion();
        }}
      />
    </>
  );
}

interface TabButtonProps {
  tab: TabItem;
  active: boolean;
  reduced: boolean;
  onPress: () => void;
}

/** 图标与文字用双层淡入淡出，选中时平滑过渡到纯黑，而不是直接跳色。 */
function TabButton({ tab, active, reduced, onPress }: TabButtonProps) {
  const selection = useSharedValue(active ? 1 : 0);
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const isDark = scheme === 'dark';
  const activeColor = isDark ? theme.text : ACTIVE_COLOR_LIGHT;
  const inactiveColor = isDark ? theme.textSecondary : INACTIVE_COLOR_LIGHT;

  useEffect(() => {
    selection.value = reduced ? (active ? 1 : 0) : withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, reduced, selection]);

  const activeFadeStyle = useAnimatedStyle(() => ({
    opacity: selection.value,
  }));

  return (
    <RipplePressable
      accessibilityRole="tab"
      accessibilityLabel={tab.title}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      rippleColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
      rippleRadius={INDICATOR_RADIUS}
      style={styles.tab}
      contentStyle={styles.tabContent}>
      <View style={styles.iconBox}>
        <SymbolView name={tab.icon} tintColor={inactiveColor} size={ICON_SIZE} />
        <Animated.View
          pointerEvents="none"
          style={[styles.iconOverlay, activeFadeStyle]}>
          <SymbolView name={tab.icon} tintColor={activeColor} size={ICON_SIZE} />
        </Animated.View>
      </View>

      <View style={styles.labelBox}>
        <Text numberOfLines={1} style={[styles.label, { color: inactiveColor }]}>
          {tab.title}
        </Text>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, styles.labelActive, { color: activeColor }, activeFadeStyle]}>
          {tab.title}
        </Animated.Text>
      </View>
    </RipplePressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  bar: {
    height: BAR_HEIGHT,
    width: '100%',
    borderRadius: BAR_RADIUS,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: (BAR_HEIGHT - INDICATOR_HEIGHT) / 2,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_RADIUS,
  },
  tab: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: INDICATOR_RADIUS,
    zIndex: 1,
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBox: {
    width: TAB_SIZE,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    fontWeight: '700',
  },
  plusHit: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: TAB_SIZE / 2,
    zIndex: 1,
  },
  plusContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCircle: {
    width: PLUS_CIRCLE_SIZE,
    height: PLUS_CIRCLE_SIZE,
    borderRadius: PLUS_CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** 底栏几何信息，供可滚动页面的 contentContainerStyle 预留底部空间。 */
export const TAB_BAR_HEIGHT = BAR_HEIGHT;
/** 100 = 66 底座 + 20 底部间距 + 14 视觉呼吸位，再叠加设备安全区。 */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BOTTOM_GAP + 14;
````

## `src/app/(tabs)/index.tsx`

行数：649（末尾换行按原文保留）

````tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GlassGlow } from '@/components/ui/glass-glow';
import {
  DASH_CARD_HEIGHT,
  DASH_CARD_WIDTH,
  DashCarousel,
  type DashCardModel,
} from '@/components/home/dash-carousel';
import { DashStack } from '@/components/home/dash-stack';
import { SearchOverlay } from '@/components/home/search-overlay';
import { TodayList } from '@/components/today/today-list';
import { countRecordsInRange } from '@/db/repositories/calendar';
import { listCoursesForDate, type CourseOnDate } from '@/features/timetable/bridge';
import { getLatestPlayed, listWishlist } from '@/db/repositories/games';
import { getProfile } from '@/db/repositories/profile';
import { getCardColor, getCardStyle, getDashMode, getHomeCards, getMiddleTab } from '@/db/repositories/settings';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
import type { SearchResult } from '@/db/repositories/search';
import type {
  CardStyle,
  DashMode,
  HomeCardId,
  MiddleTab,
  ProfileRow,
  WishlistRow,
  PlayedGameRow,
} from '@/db/types';
import { bumpDataVersion, useDataVersion } from '@/lib/data-version';
import { formatMonthDay, parseDate, todayStr } from '@/lib/date';
import { isDarkBackground, readableInk } from '@/lib/color';
import { glassCardStyle } from '@/lib/glass';
import { GlassMaterial } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';

const WEEKDAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * SharedValue 的可写封装。PanResponder 的回调由 useMemo 创建，
 * 直接在这里赋值会触发 react-hooks/immutability；集中到纯函数里更清晰。
 */
function writePullDistance(shared: SharedValue<number>, value: number) {
  shared.value = value;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { scheme, glass, homeBgMode, homeBgColor, homeBgImage } = useThemePreference();
  const today = todayStr();
  const dataVersion = useDataVersion();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [cards, setCards] = useState<HomeCardId[]>([]);
  const [dashMode, setDashMode] = useState<DashMode>('carousel');
  const [cardStyle, setCardStyle] = useState<CardStyle>('default');
  const [cardColor, setCardColor] = useState('#26262A');
  const [training, setTraining] = useState<TrainingSummary>({
    sets: 0,
    items: 0,
    firstExercise: null,
  });
  const [wishes, setWishes] = useState<WishlistRow[]>([]);
  const [latestPlayed, setLatestPlayed] = useState<PlayedGameRow | null>(null);
  const [monthCount, setMonthCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [todayCourses, setTodayCourses] = useState<CourseOnDate[]>([]);
  /** 底栏第三格放的是谁：决定健身/日历卡片是切到第 3 页还是开二级页。 */
  const [middle, setMiddle] = useState<MiddleTab>('fitness');
  const refreshingRef = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollOffsetRef = useRef(0);

  const load = useCallback(async () => {
    const monthStart = `${today.slice(0, 7)}-01`;
    const [year, month] = today.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${today.slice(0, 7)}-${String(daysInMonth).padStart(2, '0')}`;
    const [
      profileRow,
      cardIds,
      mode,
      style,
      color,
      summary,
      wishList,
      latest,
      monthTotal,
      todayTotal,
      courseList,
      middleTab,
    ] = await Promise.all([
      getProfile(),
      getHomeCards(),
      getDashMode(),
      getCardStyle(),
      getCardColor(),
      getTrainingSummary(today),
      listWishlist(),
      getLatestPlayed(),
      countRecordsInRange(monthStart, monthEnd),
      countRecordsInRange(today, today),
      listCoursesForDate(today),
      getMiddleTab(),
    ]);
    setProfile(profileRow);
    setCards(cardIds);
    setDashMode(mode);
    setCardStyle(style);
    setCardColor(color);
    setTraining(summary);
    setWishes(wishList);
    setLatestPlayed(latest);
    setMonthCount(monthTotal);
    setTodayCount(todayTotal);
    setTodayCourses(courseList);
    setMiddle(middleTab);
  }, [today]);

  const handleRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await load();
      // 让首页 Tasks / 计划页共享的 SQLite 数据一起重新读取。
      bumpDataVersion();
    } finally {
      refreshingRef.current = false;
    }
  }, [load]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (dataVersion === 0) return;
    load().catch(() => undefined);
  }, [dataVersion, load]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const nowTime = new Date().toTimeString().slice(0, 5);
  const nextCourse = todayCourses.find((course) => course.time >= nowTime) ?? null;

  const cardDescriptions: Record<HomeCardId, { title: string; subtitle: string; icon: DashCardModel['icon'] }> = {
    fitness: {
      title: '去健身',
      subtitle:
        training.sets > 0
          ? `已练 ${training.sets} 组${training.firstExercise ? ` · ${training.firstExercise}` : ''}`
          : '今天还没练',
      icon: {
        ios: 'figure.strengthtraining.traditional',
        android: 'fitness_center',
        web: 'fitness_center',
      },
    },
    games: {
      title: '去游戏',
      subtitle:
        wishes.length > 0
          ? `想玩 ${wishes.length} 款${latestPlayed ? ` · 最近在玩 ${latestPlayed.game_name}` : ''}`
          : '想玩清单还是空的',
      icon: { ios: 'gamecontroller', android: 'sports_esports', web: 'sports_esports' },
    },
    calendar: {
      title: '看日历',
      subtitle: `本月 ${monthCount} 条 · 今天 ${todayCount} 条`,
      icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    },
    timetable: {
      title: '看课表',
      subtitle:
        todayCourses.length > 0
          ? `今天 ${todayCourses.length} 节课${nextCourse ? ` · 下一节 ${nextCourse.name}` : ''}`
          : '今天没有课',
      icon: { ios: 'calendar.badge.clock', android: 'schedule', web: 'schedule' },
    },
  };

  const cardActions: Record<HomeCardId, () => void> = {
    // 被选进底栏第三格的模块，点卡片直接切到那个 Tab（不叠一层返回）；
    // 没被选中的只能开二级页。课表在第三格时也必须留在 Tab 内，不能跳全屏页。
    fitness: () => (middle === 'fitness' ? router.navigate('/middle') : router.push('/fitness')),
    games: () => router.push('/games'),
    calendar: () => (middle === 'calendar' ? router.navigate('/middle') : router.push('/calendar')),
    timetable: () => (middle === 'timetable' ? router.navigate('/middle') : router.push('/timetable')),
  };

  const cardModels: DashCardModel[] = cards.map((id) => ({
    id,
    title: cardDescriptions[id].title,
    subtitle: cardDescriptions[id].subtitle,
    icon: cardDescriptions[id].icon,
    onPress: cardActions[id],
  }));

  const name = profile?.name || '用户';
  const weekday = WEEKDAY_CHARS[parseDate(today).getDay()];
  const dateLabel = `今天是 ${formatMonthDay(today)} 星期${weekday}`;

  // 只在「列表已经在顶部 + 向下拉」时接手，其余情况不拦截 Tasks 的纵向滚动。
  // 用 Reanimated 的 pullDistance 驱动标题 scale 和整页 translateY，
  // Android 原生 ScrollView 不会产生负数 scrollY，因此不再依赖原生 bounces。
  const atTopRef = useRef(true);
  const pullDistance = useSharedValue(0);
  const pullResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          atTopRef.current &&
          !refreshingRef.current &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          atTopRef.current &&
          !refreshingRef.current &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          writePullDistance(pullDistance, Math.min(Math.max(gesture.dy * 0.5, 0), 120));
        },
        onPanResponderRelease: () => {
          const settle = () => {
            writePullDistance(pullDistance, withSpring(0, { damping: 18, stiffness: 180 }));
          };
          if (pullDistance.value > 60) {
            handleRefresh()
              .catch(() => undefined)
              .finally(settle);
          } else {
            settle();
          }
        },
        onPanResponderTerminate: () => {
          writePullDistance(pullDistance, withSpring(0, { damping: 18, stiffness: 180 }));
        },
      }),
    [handleRefresh, pullDistance]
  );

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          pullDistance.value,
          [0, 100],
          [1, 1.18],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullDistance.value }],
  }));

  const stackWidth = DASH_CARD_WIDTH;
  const stackHeight = DASH_CARD_HEIGHT;

  // —— 首页背景（默认 / 自定义纯色 / 自定义图片）——
  const hasImageBg = homeBgMode === 'image' && !!homeBgImage;
  const bgColor = homeBgMode === 'color' ? homeBgColor : theme.background;
  const headerInk = homeBgMode === 'color' ? readableInk(homeBgColor) : theme.text;
  const helloInk =
    homeBgMode === 'color'
      ? isDarkBackground(homeBgColor)
        ? 'rgba(255,255,255,0.78)'
        : 'rgba(17,24,39,0.6)'
      : theme.textSecondary;
  const headerShadow = hasImageBg
    ? {
        textShadowColor: scheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 12,
      }
    : null;
  /** 毛玻璃皮肤、或用户换了花哨壁纸时，Tasks 要托在一张可读性卡片上。 */
  const tasksOnGlass = glass || hasImageBg;
  const imageOverlay = GlassMaterial[scheme].imageOverlay;

  const handleSearchResultPress = (result: SearchResult) => {
    if (result.kind === 'fitness') {
      router.push({ pathname: '/fitness', params: { date: result.date } });
    } else {
      router.push({ pathname: '/day/[date]', params: { date: result.date } });
    }
  };

  const dashBlock = useMemo(() => {
    if (dashMode === 'stack') {
      return (
        <DashStack
          cards={cardModels}
          style={cardStyle}
          color={cardColor}
          width={stackWidth}
          height={stackHeight}
        />
      );
    }
    return (
      <DashCarousel
        cards={cardModels}
        style={cardStyle}
        color={cardColor}
        onManage={() => router.push('/cards')}
      />
    );
  }, [dashMode, cardModels, cardStyle, cardColor, stackWidth, stackHeight, router]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {hasImageBg ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            key={homeBgImage}
            source={{ uri: homeBgImage }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: imageOverlay }]} />
        </View>
      ) : null}
      {glass && !hasImageBg ? <GlassGlow scheme={scheme} /> : null}
      <View style={styles.pullWrap} {...pullResponder.panHandlers}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollOffsetRef.current = offsetY;
            atTopRef.current = offsetY <= 0;
          }}>
          <Animated.View testID="home-content" style={contentAnimatedStyle}>
            <Animated.View style={[styles.titleZone, { paddingTop: insets.top + 20 }]}>
              <View style={styles.headerRow}>
                <Animated.View testID="home-title-text" style={[styles.headerText, titleAnimatedStyle]}>
                  <ThemedText style={[styles.hello, { color: helloInk }, headerShadow]}>
                    Hey, {name}!
                  </ThemedText>
                  <ThemedText style={[styles.date, { color: headerInk }, headerShadow]}>
                    {dateLabel}
                  </ThemedText>
                </Animated.View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="打开个人资料"
                  onPress={() => router.push('/profile')}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                    {profile?.avatarUri ? (
                      <Image
                        key={profile.avatarUri}
                        source={{ uri: profile.avatarUri }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <ThemedText style={[styles.avatarText, { color: theme.text }]}>
                        {name.slice(0, 1)}
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              </View>
            </Animated.View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="搜索"
              onPress={() => setSearchOpen(true)}
              style={({ pressed }) => [
                styles.searchBar,
                glass
                  ? {
                      backgroundColor: GlassMaterial[scheme].card,
                      borderWidth: 0.8,
                      borderColor: GlassMaterial[scheme].cardBorder,
                      shadowColor: GlassMaterial[scheme].cardShadow,
                      shadowOpacity: GlassMaterial[scheme].cardShadowOpacity,
                    }
                  : {
                      backgroundColor: theme.backgroundElement,
                      borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'transparent',
                      shadowOpacity: scheme === 'dark' ? 0 : 0.06,
                    },
                pressed && styles.pressed,
              ]}>
              <View style={styles.searchLeft}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                  tintColor={theme.textSecondary}
                  size={20}
                />
                <ThemedText style={[styles.searchPlaceholder, { color: theme.textSecondary }]}>
                  搜索
                </ThemedText>
              </View>

              <View
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: glass
                      ? scheme === 'light'
                        ? 'rgba(255,255,255,0.5)'
                        : GlassMaterial[scheme].block
                      : theme.backgroundSelected,
                  },
                ]}>
                <SymbolView
                  name={{ ios: 'line.3.horizontal.decrease', android: 'tune', web: 'tune' }}
                  tintColor={theme.text}
                  size={18}
                />
              </View>
            </Pressable>

            <View>
              <View style={styles.sectionHeader}>
                <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Dash</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="管理首页卡片"
                  onPress={() => router.push('/cards')}
                  hitSlop={8}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <ThemedText style={[styles.sectionLink, { color: theme.textSecondary }]}>
                    管理 &gt;
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.dashBlock}>{dashBlock}</View>

              <View
                style={[
                  styles.tasks,
                  tasksOnGlass
                    ? [
                        glassCardStyle(scheme),
                        {
                          borderRadius: 24,
                          marginHorizontal: 16,
                          paddingHorizontal: 16,
                          paddingTop: 16,
                          paddingBottom: 8,
                        },
                      ]
                    : null,
                ]}>
                <View style={styles.tasksHeader}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Tasks</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="查看今日全部"
                    onPress={() => router.navigate('/today')}
                    hitSlop={8}
                    style={({ pressed }) => [pressed && styles.pressed]}>
                    <ThemedText style={[styles.sectionLink, { color: theme.textSecondary }]}>
                      完成 &gt;
                    </ThemedText>
                  </Pressable>
                </View>

                <TodayList
                  date={today}
                  emptyText="今天还没有安排"
                  checkSize={20}
                  checkRadius={6}
                  checkBorderColor={theme.textSecondary}
                  checkCheckedColor={theme.text}
                  checkCheckColor={theme.background}
                  courseVariant="home"
                  textColor={theme.text}
                  secondaryTextColor={theme.textSecondary}
                  rowSpacing={16}
                  showSeparators={false}
                  showAddRow={false}
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <SearchOverlay
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectResult={handleSearchResultPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pullWrap: {
    flex: 1,
    // Web 上下拉时不要选中文字：selectionchange 会抢走 PanResponder 的响应者。
    userSelect: 'none',
  },

  titleZone: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerText: {
    flex: 1,
    // 从左侧放大，避免下拉时问候语与右侧头像被屏幕边缘裁掉。
    transformOrigin: 'left center',
  },
  hello: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  date: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  searchBar: {
    marginTop: 24,
    marginHorizontal: 20,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  searchLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    lineHeight: 20,
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginTop: 32,
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 13,
    lineHeight: 18,
  },
  dashBlock: {},
  tasks: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
````

## `src/app/(tabs)/settings.tsx`

行数：890（末尾换行按原文保留）

````tsx
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TAB_BAR_CLEARANCE } from '@/components/nav/app-tab-bar';
import { ActionMenu } from '@/components/ui/action-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { Spacing } from '@/constants/theme';
import {
  BackupError,
  clearAllData,
  exportBackup,
  importBackup,
  summarizeBackup,
  type BackupPayload,
} from '@/db/repositories/backup';
import {
  getFitnessDefaults,
  getMiddleTab,
  getSortMode,
  setFitnessDefaults,
  setMiddleTab,
  setSortMode,
  type ThemeSetting,
} from '@/db/repositories/settings';
import {
  DEFAULT_HOME_BG_COLOR,
  MIDDLE_TABS,
  MIDDLE_TAB_LABELS,
  SORT_MODES,
  SORT_MODE_LABELS,
  type MiddleTab,
  type ProfileRow,
  type SortMode,
} from '@/db/types';
import { bumpDataVersion } from '@/lib/data-version';
import { buildAutoBackupName, buildBackupFileName, parseBackupText, serializeBackup } from '@/lib/backup-text';
import { pickBackupText, saveAutoBackup, saveBackupFile } from '@/lib/backup-file';
import { deleteAvatarFile } from '@/lib/avatar';
import { deleteHomeBgImage } from '@/lib/home-bg-image';
import { getProfile } from '@/db/repositories/profile';
import { useThemePreference } from '@/theme/theme-context';
import { useTheme } from '@/hooks/use-theme';

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

function errorMessage(error: unknown): string {
  if (error instanceof BackupError) return error.message;
  if (error instanceof Error) return error.message;
  return '操作失败';
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    preference,
    setPreference,
    homeBgImage,
    setAppSkin,
    setHomeBgMode,
    setHomeBgColor,
    setHomeBgImage,
  } = useThemePreference();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<BackupPayload | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [defaultReps, setDefaultReps] = useState(8);
  const [defaultWeight, setDefaultWeight] = useState(0);
  const [editingFitnessField, setEditingFitnessField] = useState<'reps' | 'weight' | null>(null);
  const [draftFitnessValue, setDraftFitnessValue] = useState('');
  const [sortMode, setSortModeState] = useState<SortMode>('memo-first');
  const [sortOpen, setSortOpen] = useState(false);
  const [middle, setMiddleState] = useState<MiddleTab>('fitness');
  const [middleOpen, setMiddleOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then(setProfile)
        .catch(() => undefined);
      getSortMode()
        .then(setSortModeState)
        .catch(() => undefined);
      getMiddleTab()
        .then(setMiddleState)
        .catch(() => undefined);
      getFitnessDefaults()
        .then((defaults) => {
          setDefaultReps(defaults.reps);
          setDefaultWeight(defaults.weight);
        })
        .catch(() => undefined);
    }, [])
  );

  const version = Constants.expoConfig?.version ?? '1.2.2';

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await exportBackup();
      const result = await saveBackupFile(buildBackupFileName(), serializeBackup(payload));
      setMessage(result.message);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const handlePickImport = async () => {
    setError(null);
    try {
      const text = await pickBackupText();
      if (!text) return;
      setImportPayload(parseBackupText(text));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const handleConfirmImport = async () => {
    if (!importPayload) return;
    setBusy(true);
    setError(null);
    try {
      const current = serializeBackup(await exportBackup());
      const location = await saveAutoBackup(buildAutoBackupName(), current);
      await importBackup(importPayload);
      setImportPayload(null);
      setMessage(`导入完成，数据已整体替换。${location}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setClearOpen(false);
    setBusy(true);
    setError(null);
    try {
      const current = serializeBackup(await exportBackup());
      const location = await saveAutoBackup(buildAutoBackupName(), current);
      await clearAllData();
      await deleteAvatarFile(profile?.avatarUri ?? null);
      await deleteHomeBgImage(homeBgImage);
      setProfile(null);
      const clearedDefaults = await getFitnessDefaults();
      setDefaultReps(clearedDefaults.reps);
      setDefaultWeight(clearedDefaults.weight);
      await setPreference('system');
      await setAppSkin('default');
      await setHomeBgMode('default');
      await setHomeBgColor(DEFAULT_HOME_BG_COLOR);
      await setHomeBgImage(null);
      bumpDataVersion();
      setMessage(`已清空所有数据，主题恢复为「跟随系统」，外观恢复默认。${location}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const openFitnessEditor = (field: 'reps' | 'weight') => {
    setDraftFitnessValue(String(field === 'reps' ? defaultReps : defaultWeight));
    setEditingFitnessField(field);
  };

  const draftTrimmed = draftFitnessValue.trim();
  const draftNumber = Number(draftTrimmed);
  const fitnessDraftValid =
    editingFitnessField !== null &&
    draftTrimmed !== '' &&
    Number.isInteger(draftNumber) &&
    (editingFitnessField === 'reps' ? draftNumber >= 1 : draftNumber >= 0);

  const handleSaveFitnessDefaults = async () => {
    const field = editingFitnessField;
    if (!field || !fitnessDraftValid) return;
    const value = Number(draftFitnessValue.trim());
    const nextDefaults =
      field === 'reps'
        ? { reps: value, weight: defaultWeight }
        : { reps: defaultReps, weight: value };
    try {
      await setFitnessDefaults(nextDefaults);
      setDefaultReps(nextDefaults.reps);
      setDefaultWeight(nextDefaults.weight);
      bumpDataVersion();
      setEditingFitnessField(null);
      setError(null);
      setMessage('健身默认值已保存。');
    } catch (reason) {
      setEditingFitnessField(null);
      setMessage(null);
      setError(errorMessage(reason));
    }
  };

  const summary = importPayload ? summarizeBackup(importPayload) : null;

  return (
    <ThemedView style={styles.container} glow>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom },
          ]}>
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            <ThemedText type="subtitle" style={[styles.title, { color: theme.text }]}>
              设置
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              数据与偏好
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`账号 ${profile?.name ?? '用户'}`}
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.account, pressed && styles.pressed]}>
            <View style={[styles.accountAvatar, { backgroundColor: theme.backgroundElement }]}>
              {profile?.avatarUri ? (
                <Image
                  key={profile.avatarUri}
                  source={{ uri: profile.avatarUri }}
                  style={styles.accountAvatarImage}
                />
              ) : (
                <ThemedText type="subtitle" style={styles.accountInitial}>
                  {(profile?.name ?? '用户').slice(0, 1)}
                </ThemedText>
              )}
            </View>
            <ThemedText style={styles.accountName}>{profile?.name ?? '用户'}</ThemedText>
          </Pressable>

          {message ? (
            <ThemedView type="backgroundElement" style={styles.messageBox}>
              <ThemedText type="small">{message}</ThemedText>
            </ThemedView>
          ) : null}

          {error ? (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText type="small" style={styles.errorText}>
                {error}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            快捷入口
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="快捷入口 健身"
              onPress={() => router.push('/fitness')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedText type="small">健身</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="快捷入口 课表"
              onPress={() => router.push('/timetable')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedText type="small">课表</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="快捷入口 日历回顾"
              onPress={() => router.push('/calendar')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedText type="small">日历回顾</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="快捷入口 游戏"
              onPress={() => router.push('/games')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedText type="small">游戏</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            界面与外观
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="首页卡片"
              onPress={() => router.push('/cards')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">首页卡片</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  调整 Dash 卡片的顺序与显示开关
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`第三个标签 ${MIDDLE_TAB_LABELS[middle]}`}
              onPress={() => setMiddleOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">第三个标签</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  底栏中间放健身、课表还是日历
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {MIDDLE_TAB_LABELS[middle]} ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="个性化"
              onPress={() => router.push('/personalize')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">个性化</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  主题与个性皮肤、首页背景、Dash 卡片模式与样式
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <View style={styles.row}>
              <ThemedText type="small">主题</ThemedText>
              <View style={styles.themeOptions}>
                {THEME_OPTIONS.map((option) => {
                  const active = preference === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => {
                        setPreference(option.value).catch(() => undefined);
                      }}
                      style={({ pressed }) => [
                        styles.themeChip,
                        { backgroundColor: active ? theme.text : theme.background },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="small"
                        style={{ color: active ? theme.background : theme.text }}>
                        {active ? '✓ ' : ''}
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            功能偏好
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="列表排序"
              onPress={() => setSortOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">列表排序</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  首页与今日计划共用
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {SORT_MODE_LABELS[sortMode]} ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="健身默认次数"
              onPress={() => openFitnessEditor('reps')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">默认次数</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  新增健身训练动作时的默认每组次数
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {defaultReps} 次 ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="健身默认重量"
              onPress={() => openFitnessEditor('weight')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">默认重量</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  新增健身训练动作时的默认负重
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {defaultWeight} kg ›
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            数据与安全
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="备份数据"
              disabled={busy}
              onPress={() => handleExport().catch(() => undefined)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">备份数据</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  导出全部数据为一个 JSON 文件
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="导入备份"
              disabled={busy}
              onPress={() => handlePickImport().catch(() => undefined)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">导入备份</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  选择备份文件，整体替换当前数据
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="清空所有数据"
              disabled={busy}
              onPress={() => setClearOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small" style={styles.danger}>
                  清空所有数据
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  清空前会自动备份一份
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            关于
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <View style={styles.row}>
              <ThemedText type="small">生活记录</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                版本 {version}
              </ThemedText>
            </View>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            数据只保存在本机，不联网、不上传。
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      <ModalSheet
        visible={importPayload !== null}
        title="确认导入备份"
        onClose={() => setImportPayload(null)}
        footer={
          <View style={styles.modalActions}>
            <Pressable
              onPress={() => setImportPayload(null)}
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">取消</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleConfirmImport().catch(() => undefined)}
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.text },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" style={{ color: theme.background }}>
                确认导入
              </ThemedText>
            </Pressable>
          </View>
        }>
        {summary ? (
          <View style={styles.summaryList}>
            <ThemedText type="small" themeColor="textSecondary">
              导出时间：{summary.exportedAt || '未知'}
            </ThemedText>
            <ThemedText type="small">任务 {summary.tasks} 条</ThemedText>
            <ThemedText type="small">训练项目 {summary.trainingItems} 个</ThemedText>
            <ThemedText type="small">完成组 {summary.setRecords} 组</ThemedText>
            <ThemedText type="small">事件 {summary.events} 条</ThemedText>
            <ThemedText type="small">想玩 {summary.wishlist} 条</ThemedText>
            <ThemedText type="small">已玩 {summary.playedGames} 条</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.warning}>
              导入会整体替换当前数据；导入前会自动把当前数据另存一份。
            </ThemedText>
          </View>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={sortOpen}
        title="列表排序"
        onClose={() => setSortOpen(false)}>
        <View style={styles.summaryList}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.warning}>
            同时作用于首页 Tasks 与今日计划。置顶内容始终排在最前，已完成的沉在底部。
          </ThemedText>
          {SORT_MODES.map((mode) => {
            const active = sortMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  setSortModeState(mode);
                  setSortOpen(false);
                  setSortMode(mode)
                    .then(() => bumpDataVersion())
                    .catch(() => undefined);
                }}
                style={({ pressed }) => [
                  styles.sortRow,
                  { backgroundColor: active ? theme.background : 'transparent' },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small">
                  {active ? '✓ ' : ''}
                  {SORT_MODE_LABELS[mode]}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  {mode === 'memo-first'
                    ? '备忘置顶、有时间的在前'
                    : mode === 'task-first'
                      ? '计划置顶、有时间的在前'
                      : '只按时间排列'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ModalSheet>

      <ModalSheet
        visible={editingFitnessField !== null}
        title={editingFitnessField === 'reps' ? '修改默认次数' : '修改默认重量'}
        onClose={() => setEditingFitnessField(null)}
        footer={
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="取消修改健身默认值"
              onPress={() => setEditingFitnessField(null)}
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">取消</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="保存健身默认值"
              disabled={!fitnessDraftValid}
              onPress={() => handleSaveFitnessDefaults().catch(() => undefined)}
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.text },
                pressed && styles.pressed,
                !fitnessDraftValid && styles.disabled,
              ]}>
              <ThemedText type="small" style={{ color: theme.background }}>
                保存
              </ThemedText>
            </Pressable>
          </View>
        }>
        <View style={styles.fitnessDialogBody}>
          <ThemedText type="small" themeColor="textSecondary">
            {editingFitnessField === 'reps'
              ? '请输入大于等于 1 的整数（单位：次）'
              : '请输入大于等于 0 的整数（单位：kg）'}
          </ThemedText>
          <TextInput
            value={draftFitnessValue}
            onChangeText={setDraftFitnessValue}
            autoFocus
            keyboardType="number-pad"
            maxLength={editingFitnessField === 'reps' ? 3 : 4}
            accessibilityLabel={editingFitnessField === 'reps' ? '默认次数输入' : '默认重量输入'}
            style={[styles.dialogInput, { backgroundColor: theme.background, color: theme.text }]}
          />
          {editingFitnessField !== null && !fitnessDraftValid ? (
            <ThemedText type="small" style={styles.dialogError}>
              {editingFitnessField === 'reps'
                ? '请输入大于等于 1 的整数'
                : '请输入大于等于 0 的整数'}
            </ThemedText>
          ) : null}
        </View>
      </ModalSheet>

      <ActionMenu
        visible={middleOpen}
        title="第三个标签"
        items={MIDDLE_TABS.map((tab) => ({
          key: tab,
          label: MIDDLE_TAB_LABELS[tab],
          onPress: () => {
            setMiddleOpen(false);
            setMiddleState(tab);
            setMiddleTab(tab)
              .then(() => bumpDataVersion())
              .catch(() => undefined);
          },
        }))}
        onClose={() => setMiddleOpen(false)}
      />

      <ConfirmDialog
        visible={clearOpen}
        title="清空所有数据？"
        message="所有任务、训练、事件、游戏记录都会被删除，清空前会自动备份一份。"
        confirmLabel="确认清空"
        danger
        onCancel={() => setClearOpen(false)}
        onConfirm={() => handleClear().catch(() => undefined)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  header: {
    paddingHorizontal: Spacing.one,
    // 顶部多留 8dp：深色模式下标题与状态栏之间要有呼吸位，避免被安全区边缘挤压。
    paddingTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    // 显式指定文字色，避免任何父级/旧主题残留把深色模式标题染成背景色。
    flexShrink: 0,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarImage: {
    width: '100%',
    height: '100%',
  },
  accountInitial: {
    fontSize: 22,
    lineHeight: 28,
  },
  accountName: {
    fontSize: 22,
    fontWeight: 600,
  },
  sectionLabel: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  group: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  hint: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dialogInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  fitnessDialogBody: {
    gap: Spacing.one,
  },
  dialogError: {
    marginTop: Spacing.one,
    fontSize: 12,
    color: '#D64545',
  },
  disabled: {
    opacity: 0.4,
  },
  themeChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  messageBox: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  errorBox: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  errorText: {
    color: '#D64545',
  },
  danger: {
    color: '#D64545',
  },
  footer: {
    marginTop: Spacing.four,
    textAlign: 'center',
    fontSize: 11,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  modalButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    minWidth: 80,
    alignItems: 'center',
  },
  summaryList: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  warning: {
    marginTop: Spacing.two,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  sortRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: 2,
  },
});
````

## `src/app/personalize/index.tsx`

行数：400（末尾换行按原文保留）

````tsx
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ColorPickerPanel } from '@/components/personalize/color-picker';
import { HomeBgImagePanel } from '@/components/personalize/home-bg-image-panel';
import { SettingsRow } from '@/components/timetable/settings-row';
import { Space, Type } from '@/constants/theme';
import {
  getCardStyle,
  getDashMode,
  getHideCompleted,
  setCardStyle,
  setDashMode,
  setHideCompleted,
} from '@/db/repositories/settings';
import {
  APP_SKINS,
  APP_SKIN_LABELS,
  CARD_STYLES,
  CARD_STYLE_LABELS,
  DASH_MODES,
  DASH_MODE_LABELS,
  HOME_BG_MODES,
  HOME_BG_MODE_LABELS,
  type CardStyle,
  type DashMode,
} from '@/db/types';
import { bumpDataVersion } from '@/lib/data-version';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';

export default function PersonalizeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    preference,
    setPreference,
    skin,
    setAppSkin,
    homeBgMode,
    homeBgColor,
    setHomeBgMode,
    setHomeBgColor,
  } = useThemePreference();
  const [dashMode, setDashModeState] = useState<DashMode>('carousel');
  const [cardStyle, setCardStyleState] = useState<CardStyle>('default');
  const [hideCompleted, setHideCompletedState] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getDashMode()
        .then(setDashModeState)
        .catch(() => undefined);
      getCardStyle()
        .then(setCardStyleState)
        .catch(() => undefined);
      getHideCompleted()
        .then(setHideCompletedState)
        .catch(() => undefined);
    }, [])
  );

  const themeLabel =
    preference === 'system' ? '跟随系统' : preference === 'dark' ? '深色' : '浅色';

  return (
    <ThemedView style={styles.container} glow>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Breadcrumb
            trail={[
              { label: '我的', onPress: () => router.back() },
              { label: '个性化' },
            ]}
          />
          <ThemedText style={styles.title}>个性化</ThemedText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            主题
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {(['system', 'light', 'dark'] as const).map((value, index) => {
              const label = value === 'system' ? '跟随系统' : value === 'dark' ? '深色' : '浅色';
              const active = preference === value;
              return (
                <View key={value}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`主题 ${label}`}
                    onPress={() => setPreference(value).catch(() => undefined)}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {label}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            个性皮肤
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {APP_SKINS.map((value, index) => {
              const active = skin === value;
              return (
                <View key={value}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`个性皮肤 ${APP_SKIN_LABELS[value]}`}
                    onPress={() => {
                      setAppSkin(value).catch(() => undefined);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      styles.skinRow,
                      pressed && styles.pressed,
                    ]}>
                    <View
                      style={[
                        styles.skinPreview,
                        value === 'glass'
                          ? styles.glassPreview
                          : [styles.classicPreview, { backgroundColor: theme.text }],
                      ]}
                    />
                    <View style={styles.skinText}>
                      <ThemedText type="small">
                        {active ? '✓ ' : ''}
                        {APP_SKIN_LABELS[value]}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {value === 'glass'
                          ? 'iOS 磨砂透光玻璃质感 + 镜面高光描边'
                          : '纯色高对比度现代极简风'}
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            首页背景
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {HOME_BG_MODES.map((mode, index) => {
              const active = homeBgMode === mode;
              return (
                <View key={mode}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`首页背景 ${HOME_BG_MODE_LABELS[mode]}`}
                    onPress={() => {
                      setHomeBgMode(mode).catch(() => undefined);
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {HOME_BG_MODE_LABELS[mode]}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}

            {homeBgMode === 'color' ? (
              <View style={[styles.panelDivider, { borderTopColor: theme.background }]}>
                <ColorPickerPanel
                  color={homeBgColor}
                  onChange={(hex) => {
                    setHomeBgColor(hex).catch(() => undefined);
                  }}
                />
              </View>
            ) : null}

            {homeBgMode === 'image' ? (
              <View style={[styles.panelDivider, { borderTopColor: theme.background }]}>
                <HomeBgImagePanel />
              </View>
            ) : null}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            Dash 卡片模式
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {DASH_MODES.map((mode, index) => {
              const active = dashMode === mode;
              return (
                <View key={mode}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`卡片模式 ${DASH_MODE_LABELS[mode]}`}
                    onPress={() => {
                      setDashModeState(mode);
                      setDashMode(mode)
                        .then(() => bumpDataVersion())
                        .catch(() => undefined);
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {DASH_MODE_LABELS[mode]}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            卡片样式
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {CARD_STYLES.map((style, index) => {
              const active = cardStyle === style;
              return (
                <View key={style}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`卡片样式 ${CARD_STYLE_LABELS[style]}`}
                    onPress={() => {
                      setCardStyleState(style);
                      setCardStyle(style)
                        .then(() => bumpDataVersion())
                        .catch(() => undefined);
                      if (style === 'custom') router.push('/personalize/cards');
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {CARD_STYLE_LABELS[style]}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <SettingsRow
            label="自定义颜色"
            value={cardStyle === 'custom' ? '去设置' : undefined}
            placeholder="仅自定义样式可用"
            disabled={cardStyle !== 'custom'}
            onPress={() => router.push('/personalize/cards')}
          />

          <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
            当前主题：{themeLabel}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            列表
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <ThemedText type="small">隐藏已完成</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  勾选后不再显示在任务列表里
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="隐藏已完成"
                value={hideCompleted}
                onValueChange={(next) => {
                  setHideCompletedState(next);
                  setHideCompleted(next)
                    .then(() => bumpDataVersion())
                    .catch(() => undefined);
                }}
                trackColor={{ true: theme.text, false: theme.background }}
              />
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Space.three,
    paddingTop: Space.two,
    paddingBottom: Space.one,
    gap: Space.one,
  },
  title: {
    fontSize: Type.display.fontSize,
    lineHeight: Type.display.lineHeight,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: Space.three,
    paddingBottom: Space.five,
  },
  sectionLabel: {
    marginTop: Space.three,
    marginBottom: Space.one,
    paddingHorizontal: Space.one,
  },
  group: {
    borderRadius: Space.three,
    paddingHorizontal: Space.three,
  },
  optionRow: {
    paddingVertical: Space.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  skinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.three,
  },
  skinPreview: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  classicPreview: {
    borderColor: 'rgba(255,255,255,0.55)',
  },
  glassPreview: {
    backgroundColor: 'rgba(147,197,253,0.35)',
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  skinText: {
    flex: 1,
    gap: 2,
  },
  panelDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Space.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.two,
    paddingVertical: Space.two,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  footnote: {
    marginTop: Space.three,
    paddingHorizontal: Space.one,
  },
});
````

