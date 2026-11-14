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
