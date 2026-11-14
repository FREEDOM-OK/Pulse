import { Image, StyleSheet, View } from 'react-native';

import { GlassMaterial, type GlassScheme } from '@/constants/theme';
import { mixHex } from '@/lib/color';
import { useThemePreference } from '@/theme/theme-context';

/** 渐变分段数：段数够多时肉眼看不到接缝，同时避免上百个 View 拖慢滚动。 */
const GRADIENT_BANDS = 32;
/** 纯色模式下的顶部微光段数。 */
const SHEEN_BANDS = 24;

type GradientStops = [string, string, string];

const PRESET_GRADIENTS: Record<'mist' | 'zen', Record<GlassScheme, GradientStops>> = {
  mist: {
    light: ['#DCE8F8', '#EEF2F9', '#F2EBF8'],
    dark: ['#0F172A', '#0B0D14', '#171324'],
  },
  zen: {
    light: ['#F6EFE2', '#F4F6F0', '#DFEFE6'],
    dark: ['#1C1917', '#0F1412', '#0D1F18'],
  },
};

function gradientColor(stops: GradientStops, ratio: number): string {
  return ratio <= 0.5
    ? mixHex(stops[0], stops[1], ratio * 2)
    : mixHex(stops[1], stops[2], (ratio - 0.5) * 2);
}

/** 全宽水平条逐段插值，拼出无接缝的垂直三色渐变（绝不画圆饼）。 */
function GradientFill({ stops }: { stops: GradientStops }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: GRADIENT_BANDS }, (_, index) => {
        const ratio = index / (GRADIENT_BANDS - 1);
        return (
          <View
            key={`band-${index}`}
            style={{ flex: 1, backgroundColor: gradientColor(stops, ratio) }}
          />
        );
      })}
    </View>
  );
}

/** 纯色模式 + 毛玻璃时的顶部白色微光，让死板纯色也能衬托玻璃光泽。 */
function TopSheen() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: SHEEN_BANDS }, (_, index) => {
        const ratio = index / (SHEEN_BANDS - 1);
        const alpha = 0.35 * (1 - ratio);
        return (
          <View
            key={`sheen-${index}`}
            style={{ flex: 1, backgroundColor: `rgba(255, 255, 255, ${alpha.toFixed(3)})` }}
          />
        );
      })}
    </View>
  );
}

/**
 * 全局页面背景：首页 / 计划 / 第三页 / 我的 共用。
 * 只画视觉层，pointerEvents="none"，不参与交互，也不改任何业务数据。
 */
export function PageBackground() {
  const { scheme, glass, homeBgMode, homeBgColor, homeBgImage } = useThemePreference();

  if (homeBgMode === 'image' && homeBgImage) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="page-background">
        <Image
          resizeMode="cover"
          source={{ uri: homeBgImage }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: GlassMaterial[scheme].imageOverlay },
          ]}
        />
      </View>
    );
  }

  if (homeBgMode === 'color') {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: homeBgColor }]}
        testID="page-background">
        {glass ? <TopSheen /> : null}
      </View>
    );
  }

  if (homeBgMode === 'zen') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="page-background">
        <GradientFill stops={PRESET_GRADIENTS.zen[scheme]} />
      </View>
    );
  }

  // 'mist' 预设，以及「默认底色 + 毛玻璃」都走晨雾冰川渐变。
  if (homeBgMode === 'mist' || (homeBgMode === 'default' && glass)) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="page-background">
        <GradientFill stops={PRESET_GRADIENTS.mist[scheme]} />
      </View>
    );
  }

  return null;
}