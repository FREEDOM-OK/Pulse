import { Platform, type ViewStyle } from 'react-native';

import { GlassMaterial, type GlassScheme } from '@/constants/theme';

/**
 * 毛玻璃的通用样式工厂。
 * 只返回视觉属性，圆角/尺寸仍由各组件自己的样式决定，避免覆盖布局。
 */

/**
 * Web 端用真正的 backdrop-filter 做 blur(22px) saturate(180%)；
 * 原生端没有该 CSS 能力，靠下面加高磨砂不透明度 + 冷调色彩偏移来逼近同样的雾化感。
 */
const WEB_BACKDROP: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
      } as unknown as ViewStyle)
    : {};

/**
 * 卡片磨砂表面：高磨砂底 + 上亮下暗的 Apple 式不对称折射高光边。
 * 铁律：Android 上半透明卡片严禁开 elevation，否则硬件阴影投射块会透成灰框套白块。
 */
export function glassCardStyle(scheme: GlassScheme): ViewStyle {
  const isLight = scheme === 'light';
  return {
    backgroundColor: GlassMaterial[scheme].card,
    borderTopWidth: 1.2,
    borderLeftWidth: 1,
    borderRightWidth: 0.8,
    borderBottomWidth: 0.8,
    borderTopColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.24)',
    borderLeftColor: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.16)',
    borderRightColor: isLight ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.08)',
    borderBottomColor: isLight ? 'rgba(226, 232, 240, 0.65)' : 'rgba(255, 255, 255, 0.06)',
    ...WEB_BACKDROP,
    elevation: 0,
    shadowOpacity: 0,
  };
}

/** 底栏胶囊：高浓度悬浮磨砂，配合真正的 Web backdrop-filter。 */
export function glassBarStyle(scheme: GlassScheme): ViewStyle {
  const material = GlassMaterial[scheme];
  return {
    backgroundColor: material.bar,
    borderWidth: 1,
    borderColor: material.barBorder,
    ...WEB_BACKDROP,
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
    ...WEB_BACKDROP,
    shadowOpacity: 0,
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