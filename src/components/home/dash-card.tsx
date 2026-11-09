import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import type { CardStyle, HomeCardId } from '@/db/types';
import { CartoonArt } from './cartoon-art';

export interface DashCardProps {
  title: string;
  subtitle: string;
  icon: Parameters<typeof SymbolView>[0]['name'];
  /** 卡片样式：默认（黑白）/ 自定义颜色 / 卡通。 */
  style: CardStyle;
  /** 自定义样式下的底色（仅主卡使用）。 */
  color: string;
  /** 卡片种类，卡通样式用来选图案。 */
  kind: HomeCardId;
  /** primary = 深色主卡，plain = 浅色普通卡。 */
  tone?: 'primary' | 'plain';
  width: number;
  height: number;
  onPress: () => void;
}

const PRIMARY_BG = '#26262A';
const PLAIN_BG = '#F2F2F4';

/**
 * Dash 卡片：无边框、无渐变、无纹理（PRDv1.2.2 第 3.2 / 3.7 节）。
 * 264×163 时宽高比为黄金比。
 */
export function DashCard({
  title,
  subtitle,
  icon,
  style,
  color,
  kind,
  tone = 'plain',
  width,
  height,
  onPress,
}: DashCardProps) {
  const isPrimary = tone === 'primary';
  const isDark = isPrimary;
  const backgroundColor = isPrimary ? (style === 'custom' ? color : PRIMARY_BG) : PLAIN_BG;
  const ink = isDark ? '#FFFFFF' : '#111111';
  const subInk = isDark ? 'rgba(255,255,255,0.64)' : '#6B6B70';
  const showCartoon = isPrimary && style === 'cartoon';

  return (
    <RipplePressable
      style={[styles.card, { width, height, backgroundColor }]}
      onPress={onPress}
      rippleColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'}
      accessibilityRole="button"
      accessibilityLabel={`${title}，${subtitle}`}>
      <View style={styles.topRow}>
        {showCartoon ? (
          <View style={styles.artSlot}>
            <CartoonArt kind={kind} size={54} color={ink} />
          </View>
        ) : (
          <View style={[styles.iconChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF' }]}>
            <SymbolView name={icon} tintColor={ink} size={20} />
          </View>
        )}
        <View style={[styles.arrow, { borderColor: isDark ? 'rgba(255,255,255,0.32)' : '#DCDCE0' }]}>
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
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