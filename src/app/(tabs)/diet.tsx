import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DietForm } from '@/components/diet/diet-form';
import { DietRowItem } from '@/components/diet/diet-row';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateStrip, dateLabel } from '@/components/ui/date-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthPicker } from '@/components/ui/month-picker';
import { Spacing } from '@/constants/theme';
import { deleteDietRecord, listDietByDate } from '@/db/repositories/diet';
import type { DietRecordRow, MealType } from '@/db/types';
import { MEAL_TYPES } from '@/db/types';
import { todayStr } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

export default function DietScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState<DietRecordRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DietRecordRow | null>(null);
  const [deleting, setDeleting] = useState<DietRecordRow | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const load = useCallback(async () => {
    setRecords(await listDietByDate(date));
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const grouped = useMemo(() => {
    const map = new Map<MealType, DietRecordRow[]>();
    for (const meal of MEAL_TYPES) map.set(meal.value, []);
    for (const record of records) {
      const bucket = map.get(record.meal_type);
      if (bucket) bucket.push(record);
    }
    return map;
  }, [records]);

  const totalCalories = useMemo(
    () => records.reduce((sum, record) => sum + (record.calories ?? 0), 0),
    [records]
  );

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteDietRecord(deleting.id);
    setDeleting(null);
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>
              饮食
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {dateLabel(date)} · {records.length} 条记录
            </ThemedText>
          </View>
          <View style={styles.totalBox}>
            <ThemedText type="smallBold" style={styles.totalNumber}>
              {totalCalories}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              kcal
            </ThemedText>
          </View>
        </View>

        <DateStrip value={date} onChange={setDate} onOpenCalendar={() => setCalendarOpen(true)} />

        <ScrollView contentContainerStyle={styles.content}>
          {records.length === 0 ? (
            <EmptyState text="今天还没有饮食记录" hint="点右下角「＋」添加一条" />
          ) : (
            MEAL_TYPES.map((meal) => {
              const list = grouped.get(meal.value) ?? [];
              const mealCalories = list.reduce((sum, row) => sum + (row.calories ?? 0), 0);
              return (
                <View key={meal.value} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">{meal.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {list.length > 0 ? `${mealCalories} kcal` : '未记录'}
                    </ThemedText>
                  </View>
                  {list.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyMeal}>
                      这餐还没有记录
                    </ThemedText>
                  ) : (
                    <View style={styles.rows}>
                      {list.map((record) => (
                        <DietRowItem
                          key={record.id}
                          record={record}
                          onEdit={() => {
                            setEditing(record);
                            setFormOpen(true);
                          }}
                          onDelete={() => setDeleting(record)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="添加饮食"
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={[styles.fabText, { color: theme.background }]}>＋</ThemedText>
        </Pressable>
      </SafeAreaView>

      <DietForm
        visible={formOpen}
        date={date}
        record={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load().catch(() => undefined);
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
        visible={deleting !== null}
        title="删除这条饮食记录？"
        message={deleting ? `「${deleting.content}」删除后无法恢复。` : undefined}
        confirmLabel="确认删除"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          handleDelete().catch(() => undefined);
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
  totalBox: {
    alignItems: 'flex-end',
  },
  totalNumber: {
    fontSize: 22,
    lineHeight: 26,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 96,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
    marginBottom: Spacing.two,
  },
  emptyMeal: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    opacity: 0.7,
  },
  rows: {
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
