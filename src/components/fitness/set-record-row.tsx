import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { SetRecordRow } from '@/db/types';

interface SetRecordItemProps {
  record: SetRecordRow;
  /** 长按这一组记录时打开「删除」菜单。 */
  onMenu: () => void;
}

/** 已完成记录：按组动作显示次数与重量，按时间动作只显示运动分钟数。 */
export function SetRecordItem({ record, onMenu }: SetRecordItemProps) {
  const isDuration = record.tracking_type === 'duration';
  const sequenceLabel = isDuration ? '次' : '组';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${record.exercise_name}第${record.set_index}${sequenceLabel}`}
      accessibilityHint="长按可删除"
      delayLongPress={400}
      onLongPress={onMenu}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.indexBadge}>
          <ThemedText type="small" style={styles.indexText}>
            {record.set_index}
          </ThemedText>
        </View>
        <ThemedText type="small" style={styles.name} numberOfLines={1}>
          {record.exercise_name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          第{record.set_index}
          {sequenceLabel}
        </ThemedText>
        {isDuration ? (
          <ThemedText type="small" themeColor="textSecondary">
            {record.duration_minutes ?? 0}分钟
          </ThemedText>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {record.reps}次
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {record.weight}kg
            </ThemedText>
          </>
        )}
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
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  indexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(127,127,127,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    flex: 1,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});