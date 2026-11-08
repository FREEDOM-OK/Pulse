import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CourseRowItem } from '@/components/today/course-row';
import { MemoForm } from '@/components/today/memo-form';
import { MemoRowItem } from '@/components/today/memo-row';
import { TaskForm } from '@/components/today/task-form';
import { TaskRowItem } from '@/components/today/task-row';
import { ActionMenu } from '@/components/ui/action-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateStrip, dateLabel } from '@/components/ui/date-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthPicker } from '@/components/ui/month-picker';
import { Spacing } from '@/constants/theme';
import { getMonthActivity } from '@/db/repositories/calendar';
import { listCourses } from '@/db/repositories/courses';
import { deleteMemo, listMemosByDate, toggleMemoPin } from '@/db/repositories/memos';
import {
  getPeriodTimes,
  getSortMode,
  getTermConfig,
} from '@/db/repositories/settings';
import { deleteTask, listTasksByDate, toggleTask } from '@/db/repositories/tasks';
import type { MemoRow, SortMode, TaskRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion, useDataVersion } from '@/lib/data-version';
import { addDays, todayStr } from '@/lib/date';
import { coursesOnDate, type CourseOnDate } from '@/lib/timetable';
import { buildTodayItems } from '@/lib/today-items';
import { sortTodayItems, type TodayItem } from '@/lib/today-sort';

type DeleteTarget = { kind: 'task' | 'memo'; id: number; title: string } | null;

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [memos, setMemos] = useState<MemoRow[]>([]);
  const [courses, setCourses] = useState<CourseOnDate[]>([]);
  const [mode, setMode] = useState<SortMode>('memo-first');
  const [markedDays, setMarkedDays] = useState<Record<string, boolean>>({});

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [menuTask, setMenuTask] = useState<TaskRow | null>(null);

  const [memoFormOpen, setMemoFormOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoRow | null>(null);
  const [menuMemo, setMenuMemo] = useState<MemoRow | null>(null);

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const dataVersion = useDataVersion();

  const load = useCallback(async () => {
    const [taskList, memoList, courseList, term, periodTimes, sortMode, activity] =
      await Promise.all([
        listTasksByDate(date),
        listMemosByDate(date),
        listCourses(),
        getTermConfig(),
        getPeriodTimes(),
        getSortMode(),
        getMonthActivity(addDays(date, -400), addDays(date, 400)),
      ]);
    setTasks(taskList);
    setMemos(memoList);
    setCourses(coursesOnDate(date, courseList, term.startDate, periodTimes));
    setMode(sortMode);

    const marks: Record<string, boolean> = {};
    for (const [day, flags] of Object.entries(activity)) {
      if (flags.tasks || flags.events) marks[day] = true;
    }
    setMarkedDays(marks);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      // 每次进入今日计划都回到今天，避免停留在上次翻到的日期
      setDate((current) => (current === todayStr() ? current : todayStr()));
      load().catch(() => undefined);
    }, [load])
  );

  useEffect(() => {
    if (dataVersion === 0) return;
    load().catch(() => undefined);
  }, [dataVersion, load]);

  // 进入动画：日期行从左滑入，Today 稍后淡入并上移。
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerShift = useRef(new Animated.Value(-24)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleShift = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerShift, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.sequence([
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleShift, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [headerOpacity, headerShift, titleOpacity, titleShift]);

  const items = useMemo(
    () => buildTodayItems(date, tasks, memos, courses),
    [date, tasks, memos, courses]
  );

  const sorted = useMemo(() => sortTodayItems(items, mode), [items, mode]);

  const taskByKey = useMemo(
    () => new Map(tasks.map((task) => [`task-${task.id}`, task])),
    [tasks]
  );
  const memoByKey = useMemo(
    () => new Map(memos.map((memo) => [`memo-${memo.id}`, memo])),
    [memos]
  );
  const courseByKey = useMemo(
    () => new Map(courses.map((course) => [`course-${course.slotId}`, course])),
    [courses]
  );

  const refresh = useCallback(async () => {
    await load();
    bumpDataVersion();
  }, [load]);

  const handleToggleTask = async (task: TaskRow) => {
    await toggleTask(task.id);
    await load();
  };

  const handleToggleMemoPin = async (memo: MemoRow) => {
    await toggleMemoPin(memo.id);
    await load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    if (deleting.kind === 'task') await deleteTask(deleting.id);
    else await deleteMemo(deleting.id);
    setDeleting(null);
    await load();
  };

  const renderRow = (item: TodayItem) => {
    if (item.kind === 'task') {
      const task = taskByKey.get(item.key);
      if (!task) return null;
      return (
        <TaskRowItem
          task={task}
          onToggle={() => handleToggleTask(task).catch(() => undefined)}
          onEdit={() => {
            setEditingTask(task);
            setTaskFormOpen(true);
          }}
          onMenu={() => setMenuTask(task)}
        />
      );
    }
    if (item.kind === 'memo') {
      const memo = memoByKey.get(item.key);
      if (!memo) return null;
      return <MemoRowItem memo={memo} onMenu={() => setMenuMemo(memo)} />;
    }
    const course = courseByKey.get(item.key);
    if (!course) return null;
    return (
      <CourseRowItem
        course={course}
        onPress={() =>
          router.push(`/timetable?courseId=${course.courseId}` as Href)
        }
      />
    );
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.done === 1).length;
  const isEmpty = sorted.active.length === 0 && sorted.completed.length === 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View
          style={[
            styles.dateRow,
            { opacity: headerOpacity, transform: [{ translateX: headerShift }] },
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            {dateLabel(date)}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="打开日历"
            onPress={() => setCalendarOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.calendarButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.titleRow,
            { opacity: titleOpacity, transform: [{ translateY: titleShift }] },
          ]}>
          <ThemedText style={styles.today}>Today</ThemedText>
          {totalTasks > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              完成 {doneTasks}/{totalTasks}
            </ThemedText>
          ) : null}
        </Animated.View>

        <DateStrip value={date} onChange={setDate} marked={markedDays} />

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {isEmpty ? (
            <EmptyState text="这一天还没有安排" hint="点底部中间的「＋」添加任务或备忘" />
          ) : null}

          {sorted.active.map((item) => (
            <View key={item.key}>
              {renderRow(item)}
              <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
            </View>
          ))}

          {sorted.completed.length > 0 ? (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: completedOpen }}
                onPress={() => setCompletedOpen((open) => !open)}
                style={({ pressed }) => [styles.completedHeader, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  已完成 {sorted.completed.length} 项
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {completedOpen ? '⌄' : '›'}
                </ThemedText>
              </Pressable>
              {completedOpen
                ? sorted.completed.map((item) => (
                    <View key={item.key}>
                      {renderRow(item)}
                      <View
                        style={[styles.separator, { backgroundColor: theme.backgroundElement }]}
                      />
                    </View>
                  ))
                : null}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="新建任务或备忘"
            onPress={() => setNewMenuOpen(true)}
            style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              ＋ 新建
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <TaskForm
        visible={taskFormOpen}
        date={date}
        task={editingTask}
        onClose={() => setTaskFormOpen(false)}
        onSaved={() => {
          setTaskFormOpen(false);
          refresh().catch(() => undefined);
        }}
      />

      <MemoForm
        visible={memoFormOpen}
        date={date}
        memo={editingMemo}
        onClose={() => setMemoFormOpen(false)}
        onSaved={() => {
          setMemoFormOpen(false);
          refresh().catch(() => undefined);
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
        visible={menuTask !== null}
        title={menuTask ? menuTask.title : undefined}
        items={[
          {
            key: 'edit',
            label: '编辑',
            onPress: () => {
              setEditingTask(menuTask);
              setTaskFormOpen(true);
            },
          },
          {
            key: 'delete',
            label: '删除',
            danger: true,
            onPress: () =>
              setDeleting(
                menuTask ? { kind: 'task', id: menuTask.id, title: menuTask.title } : null
              ),
          },
        ]}
        onClose={() => setMenuTask(null)}
      />

      <ActionMenu
        visible={menuMemo !== null}
        title={menuMemo ? menuMemo.content : undefined}
        items={[
          {
            key: 'pin',
            label: menuMemo?.pinned === 1 ? '取消置顶' : '置顶',
            onPress: () => {
              if (menuMemo) handleToggleMemoPin(menuMemo).catch(() => undefined);
            },
          },
          {
            key: 'edit',
            label: '编辑',
            onPress: () => {
              setEditingMemo(menuMemo);
              setMemoFormOpen(true);
            },
          },
          {
            key: 'delete',
            label: '删除',
            danger: true,
            onPress: () =>
              setDeleting(
                menuMemo ? { kind: 'memo', id: menuMemo.id, title: menuMemo.content } : null
              ),
          },
        ]}
        onClose={() => setMenuMemo(null)}
      />

      <ActionMenu
        visible={newMenuOpen}
        title="新建"
        items={[
          {
            key: 'task',
            label: '新建任务',
            onPress: () => {
              setEditingTask(null);
              setTaskFormOpen(true);
            },
          },
          {
            key: 'memo',
            label: '新建备忘',
            onPress: () => {
              setEditingMemo(null);
              setMemoFormOpen(true);
            },
          },
        ]}
        onClose={() => setNewMenuOpen(false)}
      />

      <ConfirmDialog
        visible={deleting !== null}
        title={deleting?.kind === 'memo' ? '删除备忘？' : '删除任务？'}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  calendarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  today: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  addRow: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});