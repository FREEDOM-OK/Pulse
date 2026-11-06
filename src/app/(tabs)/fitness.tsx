import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExercisePicker } from '@/components/fitness/exercise-picker';
import { SetRecordItem } from '@/components/fitness/set-record-row';
import { TrainingCard } from '@/components/fitness/training-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateStrip, dateLabel } from '@/components/ui/date-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthPicker } from '@/components/ui/month-picker';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/db/repositories/exercises';
import {
  addTrainingItem,
  completeSet,
  deleteSetRecord,
  deleteTrainingItem,
  listSetRecords,
  listTrainingItems,
  updateTrainingItem,
} from '@/db/repositories/training';
import type { SetRecordRow, TrainingItemRow } from '@/db/types';
import { todayStr } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

export default function FitnessScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [items, setItems] = useState<TrainingItemRow[]>([]);
  const [records, setRecords] = useState<SetRecordRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<TrainingItemRow | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<SetRecordRow | null>(null);

  const load = useCallback(async () => {
    const [nextItems, nextRecords] = await Promise.all([
      listTrainingItems(date),
      listSetRecords(date),
    ]);
    setItems(nextItems);
    setRecords(nextRecords);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const setsByItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const record of records) {
      if (record.training_item_id == null) continue;
      map.set(record.training_item_id, (map.get(record.training_item_id) ?? 0) + 1);
    }
    return map;
  }, [records]);

  const totalSets = records.length;

  const handlePick = async (exercises: Exercise[]) => {
    for (const exercise of exercises) {
      // 次数与重量省略不传，由 addTrainingItem 套用设置里的健身默认值。
      await addTrainingItem({
        date,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      });
    }
    setPickerOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    await deleteTrainingItem(deletingItem.id);
    setDeletingItem(null);
    await load();
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    await deleteSetRecord(deletingRecord.id);
    setDeletingRecord(null);
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>
              健身
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {dateLabel(date)} · 今日 {totalSets} 组
            </ThemedText>
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.headerButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small">动作库</ThemedText>
          </Pressable>
        </View>

        <DateStrip value={date} onChange={setDate} onOpenCalendar={() => setCalendarOpen(true)} />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">待训练</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {items.length} 个动作
            </ThemedText>
          </View>

          {items.length === 0 ? (
            <EmptyState text="今天还没有安排训练" hint="点右下角「＋」从动作库添加" />
          ) : (
            <View style={styles.cardList}>
              {items.map((item) => (
                <TrainingCard
                  key={item.id}
                  item={item}
                  doneSets={setsByItem.get(item.id) ?? 0}
                  onComplete={(values) => {
                    completeSet(item.id, values)
                      .then(load)
                      .catch(() => undefined);
                  }}
                  onUpdate={(patch) => {
                    updateTrainingItem(item.id, patch)
                      .then(load)
                      .catch(() => undefined);
                  }}
                  onDelete={() => setDeletingItem(item)}
                />
              ))}
            </View>
          )}

          <View style={[styles.sectionHeader, styles.sectionGap]}>
            <ThemedText type="smallBold">已完成</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              共 {totalSets} 组 · 左滑可删除
            </ThemedText>
          </View>

          {records.length === 0 ? (
            <EmptyState text="还没有完成的组" hint="练完一组点一次「完成」" />
          ) : (
            <View style={styles.cardList}>
              {records.map((record) => (
                <SetRecordItem
                  key={record.id}
                  record={record}
                  onDelete={() => setDeletingRecord(record)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="添加动作"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={[styles.fabText, { color: theme.background }]}>＋</ThemedText>
        </Pressable>
      </SafeAreaView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(exercises) => {
          handlePick(exercises).catch(() => undefined);
        }}
      />

      <MonthPicker
        visible={calendarOpen}
        value={date}
        onClose={() => setCalendarOpen(false)}
        onSelect={(selected) => {
          setDate(selected);
          setCalendarOpen(false);
        }}
      />

      <ConfirmDialog
        visible={deletingItem !== null}
        title="删除这个训练项目？"
        message={
          deletingItem
            ? `「${deletingItem.exercise_name}」的卡片会删除，已完成的 ${setsByItem.get(deletingItem.id) ?? 0} 组记录会保留。`
            : undefined
        }
        confirmLabel="确认删除"
        danger
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => {
          handleDelete().catch(() => undefined);
        }}
      />

      <ConfirmDialog
        visible={deletingRecord !== null}
        title="删除这组记录？"
        message={
          deletingRecord
            ? `「${deletingRecord.exercise_name}」第${deletingRecord.set_index}组（${deletingRecord.reps}次 × ${deletingRecord.weight}kg）会删除，后面的组会重新编号。`
            : undefined
        }
        confirmLabel="确认删除"
        danger
        onCancel={() => setDeletingRecord(null)}
        onConfirm={() => {
          handleDeleteRecord().catch(() => undefined);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  headerButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 96,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
    marginBottom: Spacing.two,
  },
  sectionGap: {
    marginTop: Spacing.five,
  },
  cardList: {
    gap: Spacing.two,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    fontSize: 28,
    lineHeight: 32,
  },
  pressed: {
    opacity: 0.8,
  },
});
