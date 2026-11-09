import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { CourseWithSlots } from '@/db/repositories/courses';
import { useTheme } from '@/hooks/use-theme';
import { Space, Type } from '@/constants/theme';
import { formatWeeksRange } from '@/lib/timetable';
import { WEEKDAY_LABELS } from '@/lib/timetable-grid';

export type DeleteScope = 'week' | 'all';

interface CourseDetailSheetProps {
  visible: boolean;
  course: CourseWithSlots | null;
  totalWeeks: number;
  week: number;
  /** 本周是否已被「仅本周删除」。 */
  skippedThisWeek: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onNoteSave: (note: string) => void;
  onDelete: (scope: DeleteScope) => void;
  onRestoreWeek: () => void;
}

/** 课程详情：只读信息 + 备注可直接写，编辑按钮大于删除。 */
export function CourseDetailSheet({
  visible,
  course,
  totalWeeks,
  week,
  skippedThisWeek,
  onClose,
  onEdit,
  onCopy,
  onNoteSave,
  onDelete,
  onRestoreWeek,
}: CourseDetailSheetProps) {
  const theme = useTheme();
  const [note, setNote] = useState('');
  const [scope, setScope] = useState<DeleteScope>('week');

  useEffect(() => {
    if (visible) {
      setNote(course?.note ?? '');
      setScope('week');
    }
  }, [visible, course]);

  if (!course) return null;

  const color = course.color ?? '#4C8DF6';
  const slots = [...course.slots].sort(
    (a, b) => a.weekday - b.weekday || a.startPeriod - b.startPeriod
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} heightRatio={0.66}>
      <View style={styles.head}>
        <View style={[styles.colorBar, { backgroundColor: color }]} />
        <ThemedText style={styles.name} numberOfLines={2}>
          {course.name}
        </ThemedText>
      </View>

      <View style={styles.rows}>
        {slots.map((slot) => (
          <Row
            key={slot.id}
            label={`周${WEEKDAY_LABELS[slot.weekday - 1]}`}
            value={`第 ${slot.startPeriod}-${slot.endPeriod} 节`}
          />
        ))}
        <Row label="周数" value={formatWeeksRange(slots[0]?.weeks ?? [], totalWeeks)} />
        {course.room ? <Row label="地点" value={course.room} /> : null}
        {course.teacher ? <Row label="老师" value={course.teacher} /> : null}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.noteLabel}>
        备注
      </ThemedText>
      <TextInput
        value={note}
        onChangeText={setNote}
        onBlur={() => onNoteSave(note.trim())}
        placeholder="写点什么，离开输入框自动保存"
        placeholderTextColor={theme.textSecondary}
        multiline
        style={[styles.noteInput, { color: theme.text, borderColor: theme.backgroundElement }]}
        accessibilityLabel="课程备注"
      />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="编辑课程"
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={[styles.editLabel, { color: theme.background }]}>编辑</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="复制课程"
          onPress={onCopy}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small">复制</ThemedText>
        </Pressable>
      </View>

      <View style={styles.deleteRow}>
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {(['week', 'all'] as DeleteScope[]).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={item === 'week' ? '本周删除范围' : '所有周删除范围'}
              onPress={() => setScope(item)}
              style={[
                styles.segmentItem,
                scope === item && { backgroundColor: theme.background },
              ]}>
              <ThemedText type="small">{item === 'week' ? '仅本周' : '所有周'}</ThemedText>
            </Pressable>
          ))}
        </View>
        {skippedThisWeek ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="恢复本周课程"
            onPress={onRestoreWeek}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small">恢复本周</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`删除课程，第 ${week} 周`}
            onPress={() => onDelete(scope)}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <ThemedText type="small" style={styles.deleteLabel}>
              删除
            </ThemedText>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.rowValue} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.two,
    paddingBottom: Space.two,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  name: {
    ...Type.section,
    flex: 1,
  },
  rows: {
    gap: Space.one,
    paddingBottom: Space.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.two,
  },
  rowLabel: {
    width: 56,
  },
  rowValue: {
    flex: 1,
  },
  noteLabel: {
    paddingBottom: Space.one,
  },
  noteInput: {
    minHeight: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Space.two,
    padding: Space.two,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: Space.two,
    paddingTop: Space.three,
  },
  editButton: {
    flex: 2,
    minHeight: 48,
    borderRadius: Space.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Space.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.two,
    paddingTop: Space.two,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: Space.three,
    padding: 2,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: Space.three - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 88,
    minHeight: 44,
    borderRadius: Space.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    color: '#D14343',
  },
  pressed: {
    opacity: 0.7,
  },
});