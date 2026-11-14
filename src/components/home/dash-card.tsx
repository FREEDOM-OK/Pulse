import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import type { CardStyle, HomeCardId } from '@/db/types';
import { useGlass, useGlassMaterial, useTheme } from '@/hooks/use-theme';
import { CartoonArt } from './cartoon-art';

export interface DashCardProps {
  title: string;
  subtitle: string;
  icon: Parameters<typeof SymbolView>[0]['name'];
  /** 卡片样式：默认（跟随主题）/ 自定义颜色 / 卡通。 */
  style: CardStyle;
  /** 自定义样式下的底色。 */
  color: string;
  /** 卡片种类，卡通样式用来选图案。 */
  kind: HomeCardId;
  width: number;
  height: number;
  onPress: () => void;
}

/**
 * Dash 卡片：无边框、无渐变、无纹理（PRDv1.2.2 第 3.2 / 3.7 节）。
 *
 * 所有卡片长一样，底色跟主题走；首页轮播使用 220×280 的竖卡。
 */
export function DashCard({
  title,
  subtitle,
  icon,
  style,
  color,
  kind,
  width,
  height,
  onPress,
}: DashCardProps) {
  const theme = useTheme();
  const glass = useGlass();
  const material = useGlassMaterial();
  const isCustom = style === 'custom';
  /** 毛玻璃皮肤只改「跟随主题」的默认卡；自定义色与卡通卡保持原样。 */
  const glassSurface = glass && style === 'default';
  const backgroundColor = isCustom
    ? color
    : glassSurface
      ? material.card
      : theme.backgroundElement;
  const ink = isCustom ? inkFor(color) : theme.text;
  const subInk = isCustom
    ? ink === '#FFFFFF'
      ? 'rgba(255,255,255,0.7)'
      : 'rgba(0,0,0,0.55)'
    : theme.textSecondary;
  const showCartoon = style === 'cartoon';
  const bubbleColor = glassSurface ? 'rgba(255,255,255,0.8)' : '#FFFFFF';

  return (
    <RipplePressable
      style={[
        styles.card,
        { width, height, backgroundColor },
        glassSurface ? { borderWidth: 1, borderColor: material.cardBorder } : null,
      ]}
      contentStyle={styles.content}
      onPress={onPress}
      rippleColor={ink === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'}
      accessibilityRole="button"
      accessibilityLabel={`${title}，${subtitle}`}>
      <View style={[styles.iconCircle, { backgroundColor: bubbleColor }]}>
        {showCartoon ? (
          <CartoonArt kind={kind} size={26} color="#1C1C1E" />
        ) : (
          <SymbolView name={icon} tintColor="#1C1C1E" size={24} />
        )}
      </View>

      <View style={styles.bottom}>
        <ThemedText style={[styles.title, { color: ink }]} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: subInk }]} numberOfLines={2}>
          {subtitle}
        </ThemedText>
      </View>

      <View style={[styles.arrow, { backgroundColor: bubbleColor }]}>
        <ThemedText style={styles.arrowText}>›</ThemedText>
      </View>
    </RipplePressable>
  );
}

/** 自定义底色上要能读清文字：按亮度阈值选黑/白。 */
function inkFor(background: string): '#111111' | '#FFFFFF' {
  const match = /^#([0-9a-f]{6})$/i.exec(background.trim());
  if (!match) return '#111111';
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111111' : '#FFFFFF';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    gap: 4,
    paddingRight: 44,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  arrow: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 22,
    lineHeight: 24,
    color: '#1C1C1E',
    marginTop: -2,
  },
});