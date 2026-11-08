import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { TabIcon } from '@/constants/tabs';
import { useTheme } from '@/hooks/use-theme';

/** 深色主卡底色（PRD 3.2 视觉基调里的深色锚点卡）。 */
export const PRIMARY_CARD_BG = '#26262A';

export interface WonderCardProps {
  title: string;
  subtitle: string;
  icon: TabIcon;
  /** 第一张固定为深色主卡。 */
  isPrimary: boolean;
  width: number;
  height: number;
  onPress: () => void;
}

export function WonderCard({ title, subtitle, icon, isPrimary, width, height, onPress }: WonderCardProps) {
  const theme = useTheme();
  const textColor = isPrimary ? '#FFFFFF' : theme.text;
  const subColor = isPrimary ? 'rgba(255,255,255,0.72)' : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}，${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, height },
        isPrimary
          ? { backgroundColor: PRIMARY_CARD_BG }
          : { backgroundColor: theme.background, borderColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {isPrimary ? (
        <View pointerEvents="none" style={styles.texture}>
          <View style={[styles.contour, styles.contour1]} />
          <View style={[styles.contour, styles.contour2]} />
          <View style={[styles.contour, styles.contour3]} />
        </View>
      ) : null}

      <View
        style={[
          styles.iconChip,
          { backgroundColor: isPrimary ? 'rgba(255,255,255,0.14)' : theme.backgroundElement },
        ]}>
        <SymbolView name={icon} size={20} tintColor={isPrimary ? '#FFFFFF' : theme.text} />
      </View>

      <View style={styles.bottom}>
        <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: subColor }]} numberOfLines={2}>
          {subtitle}
        </ThemedText>
      </View>

      <View
        style={[
          styles.arrow,
          { backgroundColor: isPrimary ? 'rgba(255,255,255,0.16)' : theme.backgroundElement },
        ]}>
        <ThemedText style={[styles.arrowText, { color: textColor }]}>›</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  texture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contour: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
  },
  contour1: {
    width: 280,
    height: 200,
    right: -110,
    top: 10,
    transform: [{ rotate: '-18deg' }],
  },
  contour2: {
    width: 230,
    height: 160,
    right: -80,
    top: 45,
    transform: [{ rotate: '-18deg' }],
  },
  contour3: {
    width: 170,
    height: 120,
    right: -50,
    top: 80,
    transform: [{ rotate: '-18deg' }],
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    gap: 2,
    paddingRight: 28,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  arrow: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 16,
    lineHeight: 18,
    marginTop: -2,
  },
  pressed: {
    opacity: 0.85,
  },
});