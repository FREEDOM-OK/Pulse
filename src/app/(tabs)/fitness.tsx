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
import { ActionMenu } from '@/components/ui/action-menu';
import { DateStrip } from '@/components/ui/date-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthPicker } from '@/components/ui/month-picker';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/db/repositories/exercises';
import { listExercises } from '@/db/repositories/exercises';
import { getMonthActivity } from '@/db/repositories/calendar';
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
import { addDays, formatDay, isToday, todayStr } from '@/lib/date';
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
  const [menuItem, setMenuItem] = useState<TrainingItemRow | null>(null);
  const [menuRecord, setMenuRecord] = useState<SetRecordRow | null>(null);
  const [markedDays, setMarkedDays] = useState<Record<string, boolean>>({});
  const [categoryById, setCategoryById] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const [nextItems, nextRecords, activity, exerciseList] = await Promise.all([
      listTrainingItems(),
      listSetRecords(date),
      getMonthActivity(addDays(date, -400), addDays(date, 400)),
      listExercises(),
    ]);
    setItems(nextItems);
    setRecords(nextRecords);

    const marks: Record<string, boolean> = {};
    for (const [day, flags] of Object.entries(activity)) {
      if (flags.fitness) marks[day] = true;
    }
    setMarkedDays(marks);

    const categories: Record<number, string> = {};
    for (const exercise of exerciseList) categories[exercise.id] = exercise.category;
    setCategoryById(categories);
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
      // 次数、重量或时间省略不传，由 addTrainingItem 按动作类型套用默认值。
      await addTrainingItem({
        date,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        trackingType: exercise.trackingType,
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
              {formatDay(date)} · {isToday(date) ? `今日 ${totalSets} 组` : `${totalSets} 组`}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.headerButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small">添加</ThemedText>
          </Pressable>
        </View>

        <DateStrip
          value={date}
          onChange={setDate}
          onOpenCalendar={() => setCalendarOpen(true)}
          marked={markedDays}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">待训练</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {items.length} 个动作
            </ThemedText>
          </View>

          {items.length === 0 ? (
            <EmptyState text="还没有待训练的动作" hint="点右上角「添加」选择动作" />
          ) : (
            <View style={styles.cardList}>
              {items.map((item) => (
                <TrainingCard
                  key={item.id}
                  item={item}
                  category={item.exercise_id != null ? categoryById[item.exercise_id] : undefined}
                  doneSets={setsByItem.get(item.id) ?? 0}
                  onComplete={(values) => {
                    completeSet(item.id, values, date)
                      .then(load)
                      .catch(() => undefined);
                  }}
                  onUpdate={(patch) => {
                    updateTrainingItem(item.id, patch)
                      .then(load)
                      .catch(() => undefined);
                  }}
                  onMenu={() => setMenuItem(item)}
                />
              ))}
            </View>
          )}

          <View style={[styles.sectionHeader, styles.sectionGap]}>
            <ThemedText type="smallBold">已完成</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              共 {totalSets} 组 · 长按可删除
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
                  onMenu={() => setMenuRecord(record)}
                />
              ))}
            </View>
          )}
        </ScrollView>

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
        marked={markedDays}
        onClose={() => setCalendarOpen(false)}
        onSelect={(selected) => {
          setDate(selected);
          setCalendarOpen(false);
        }}
      />

      <ActionMenu
        visible={menuItem !== null}
        title={menuItem ? menuItem.exercise_name : undefined}
        message="长按训练卡片可以删除它"
        items={[
          {
            key: 'delete',
            label: '删除',
            danger: true,
            onPress: () => setDeletingItem(menuItem),
          },
        ]}
        onClose={() => setMenuItem(null)}
      />

      <ActionMenu
        visible={menuRecord !== null}
        title={menuRecord ? `${menuRecord.exercise_name} 第${menuRecord.set_index}组` : undefined}
        items={[
          {
            key: 'delete',
            label: '删除',
            danger: true,
            onPress: () => setDeletingRecord(menuRecord),
          },
        ]}
        onClose={() => setMenuRecord(null)}
      />

      <ConfirmDialog
        visible={deletingItem !== null}
        title="删除这个训练项目？"
        message={
          deletingItem
            ? `「${deletingItem.exercise_name}」的卡片会删除，已完成的 ${setsByItem.get(deletingItem.id) ?? 0} 条记录会保留。`
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
            ? deletingRecord.tracking_type === 'duration'
              ? `「${deletingRecord.exercise_name}」第${deletingRecord.set_index}次（${deletingRecord.duration_minutes ?? 0}分钟）会删除，后面的记录会重新编号。`
              : `「${deletingRecord.exercise_name}」第${deletingRecord.set_index}组（${deletingRecord.reps}次 × ${deletingRecord.weight}kg）会删除，后面的组会重新编号。`
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
    paddingBottom: Spacing.four,
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
  pressed: {
    opacity: 0.8,
  },
});
