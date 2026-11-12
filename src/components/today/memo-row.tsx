import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MemoRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

interface MemoRowItemProps {
  memo: MemoRow;
  /** 固定浅色页面（如首页）的正文色；不传则跟随主题。 */
  titleColor?: string;
  /** 时间 / 置顶标签颜色。 */
  metaColor?: string;
  /** 左侧空心圆点颜色。 */
  dotColor?: string;
  onMenu: () => void;
}

/** 备忘条：空心圆点不可勾选，只能长按出菜单（置顶 / 编辑 / 删除）。 */
export function MemoRowItem({ memo, titleColor, metaColor, dotColor, onMenu }: MemoRowItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`备忘 ${memo.content}`}
      accessibilityHint="长按可置顶、编辑或删除"
      delayLongPress={400}
      onLongPress={onMenu}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View
        style={[styles.dot, { borderColor: dotColor ?? theme.textSecondary }]}
      />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          {memo.pinned === 1 ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={[styles.pin, metaColor ? { color: metaColor } : undefined]}>
              置顶
            </ThemedText>
          ) : null}
          <ThemedText
            style={[styles.title, titleColor ? { color: titleColor } : undefined]}
            numberOfLines={3}>
            {memo.content}
          </ThemedText>
        </View>
      </View>

      {memo.time ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={[styles.time, metaColor ? { color: metaColor } : undefined]}>
          {memo.time}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    marginTop: 6,
    marginHorizontal: 6,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    gap: 4,
  },
  pin: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  time: {
    marginTop: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});