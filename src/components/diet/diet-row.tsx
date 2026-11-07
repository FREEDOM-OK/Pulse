import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DietRecordRow } from '@/db/types';

interface DietRowItemProps {
  record: DietRecordRow;
  /** 长按这一行时打开「编辑 / 删除」菜单。 */
  onMenu: () => void;
}

export function DietRowItem({ record, onMenu }: DietRowItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`饮食记录 ${record.content}`}
      accessibilityHint="长按可编辑或删除"
      delayLongPress={400}
      onLongPress={onMenu}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText type="small" style={styles.content} numberOfLines={2}>
          {record.content}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {record.calories != null ? `${record.calories} kcal` : '未填热量'}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  content: {
    flex: 1,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});