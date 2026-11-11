import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import type { CardStyle, HomeCardId } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
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
 * v1.2.2 起所有卡片长一样（不再有「首卡深色」），底色跟主题走，
 * 尺寸是竖卡 264×427（黄金比 1:1.618）。
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
  const isCustom = style === 'custom';
  const backgroundColor = isCustom ? color : theme.backgroundElement;
  const ink = isCustom ? inkFor(color) : theme.text;
  const subInk = isCustom
    ? ink === '#FFFFFF'
      ? 'rgba(255,255,255,0.7)'
      : 'rgba(0,0,0,0.55)'
    : theme.textSecondary;
  const chipBackground = isCustom ? (ink === '#FFFFFF' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)') : theme.background;
  const arrowBorder = isCustom ? (ink === '#FFFFFF' ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.18)') : theme.backgroundSelected;
  const showCartoon = style === 'cartoon';

  return (
    <RipplePressable
      style={[styles.card, { width, height, backgroundColor }]}
      contentStyle={styles.content}
      onPress={onPress}
      rippleColor={ink === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'}
      accessibilityRole="button"
      accessibilityLabel={`${title}，${subtitle}`}>
      <View style={styles.topRow}>
        {showCartoon ? (
          <View style={styles.artSlot}>
            <CartoonArt kind={kind} size={54} color={ink} />
          </View>
        ) : (
          <View style={[styles.iconChip, { backgroundColor: chipBackground }]}>
            <SymbolView name={icon} tintColor={ink} size={20} />
          </View>
        )}
        <View style={[styles.arrow, { borderColor: arrowBorder }]}>
          <ThemedText style={[styles.arrowText, { color: ink }]}>›</ThemedText>
        </View>
      </View>

      <View style={styles.bottom}>
        <ThemedText style={[styles.title, { color: ink }]} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: subInk }]} numberOfLines={2}>
          {subtitle}
        </ThemedText>
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
    borderRadius: 24,
    overflow: 'hidden',
  },
  content: {
    padding: 18,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artSlot: {
    width: 56,
    height: 54,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 16,
    lineHeight: 18,
    marginTop: -1,
  },
  bottom: {
    gap: 6,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});