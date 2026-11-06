import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TaskForm } from '@/components/today/task-form';
import { TaskRowItem } from '@/components/today/task-row';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateStrip, dateLabel } from '@/components/ui/date-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthPicker } from '@/components/ui/month-picker';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TaskRow } from '@/db/types';
import {
  deleteTask,
  getTaskStats,
  listTasksByDate,
  toggleTask,
} from '@/db/repositories/tasks';
import { addDays, todayStr } from '@/lib/date';
import { getMonthActivity } from '@/db/repositories/calendar';

export default function TodayScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [markedDays, setMarkedDays] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [list, nextStats, activity] = await Promise.all([
      listTasksByDate(date),
      getTaskStats(date),
      getMonthActivity(addDays(date, -400), addDays(date, 400)),
    ]);
    setTasks(list);
    setStats(nextStats);

    const marks: Record<string, boolean> = {};
    for (const [day, flags] of Object.entries(activity)) {
      if (flags.tasks) marks[day] = true;
    }
    setMarkedDays(marks);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const handleToggle = async (task: TaskRow) => {
    await toggleTask(task.id);
    await load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteTask(deleting.id);
    setDeleting(null);
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>
              今日计划
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {dateLabel(date)}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            完成 {stats.completed}/{stats.total}
          </ThemedText>
        </View>

        <DateStrip
          value={date}
          onChange={setDate}
          onOpenCalendar={() => setCalendarOpen(true)}
          marked={markedDays}
        />

        <FlatList
          data={tasks}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState text="这一天还没有任务" hint="点右下角「＋」添加一条" />
          }
          renderItem={({ item }) => (
            <TaskRowItem
              task={item}
              onToggle={() => handleToggle(item)}
              onEdit={() => {
                setEditing(item);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(item)}
            />
          )}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="添加任务"
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

      <TaskForm
        visible={formOpen}
        date={date}
        task={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load().catch(() => undefined);
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

      <ConfirmDialog
        visible={deleting !== null}
        title="删除任务？"
        message={deleting ? `「${deleting.title}」删除后无法恢复。` : undefined}
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
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 96,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.two,
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
