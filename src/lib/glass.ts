import type { ViewStyle } from 'react-native';

import { GlassMaterial, type GlassScheme } from '@/constants/theme';

/**
 * 毛玻璃的通用样式工厂。
 * 只返回视觉属性，圆角/尺寸仍由各组件自己的样式决定，避免覆盖布局。
 */

/**
 * 卡片磨砂表面：半透明底 + 镜面高光描边。
 * Android 上半透明背景叠加 elevation 会把硬件阴影投射块透出来，
 * 形成「外圈灰框 + 内圈白块」的套娃，所以这里显式压成 elevation: 0。
 */
export function glassCardStyle(scheme: GlassScheme): ViewStyle {
  const material = GlassMaterial[scheme];
  return {
    backgroundColor: material.card,
    borderWidth: 1.2,
    borderColor: material.cardBorder,
    shadowColor: material.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: material.cardShadowOpacity,
    shadowRadius: 18,
    elevation: 0,
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
    shadowOpacity: 0,
    shadowRadius: 28,
    elevation: 0,
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