import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { CourseRowItem } from '@/components/today/course-row';
import { MemoForm } from '@/components/today/memo-form';
import { MemoRowItem } from '@/components/today/memo-row';
import { TaskForm } from '@/components/today/task-form';
import { TaskRowItem } from '@/components/today/task-row';
import { ActionMenu } from '@/components/ui/action-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { StaggeredAppear } from '@/components/ui/staggered-appear';
import { Spacing } from '@/constants/theme';
import { deleteMemo, listMemosByDate, toggleMemoPin } from '@/db/repositories/memos';
import { listCourses } from '@/db/repositories/courses';
import { getHideCompleted, getPeriodTimes, getSortMode, getTermConfig } from '@/db/repositories/settings';
import { deleteTask, listTasksByDate, toggleTask } from '@/db/repositories/tasks';
import type { MemoRow, SortMode, TaskRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion, useDataVersion } from '@/lib/data-version';
import { coursesOnDate, type CourseOnDate } from '@/lib/timetable';
import { buildTodayItems } from '@/lib/today-items';
import { sortTodayItems, type TodayItem } from '@/lib/today-sort';

type DeleteTarget = { kind: 'task' | 'memo'; id: number; title: string } | null;

export interface TodayListProps {
  date: string;
  emptyText?: string;
  emptyHint?: string;
  /** 数据变化后回传任务完成情况，供页面头部显示「完成 x/y」。 */
  onStats?: (stats: { total: number; done: number }) => void;
}

/**
 * 任务 + 备忘 + 课表派生行的混合列表。
 * 首页 Tasks 与今日计划共用同一组件与同一排序逻辑（PRD 3.3 / 5.1）。
 */
export function TodayList({ date, emptyText, emptyHint, onStats }: TodayListProps) {
  const theme = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [memos, setMemos] = useState<MemoRow[]>([]);
  const [courses, setCourses] = useState<CourseOnDate[]>([]);
  const [mode, setMode] = useState<SortMode>('memo-first');

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [menuTask, setMenuTask] = useState<TaskRow | null>(null);

  const [memoFormOpen, setMemoFormOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoRow | null>(null);
  const [menuMemo, setMenuMemo] = useState<MemoRow | null>(null);

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  /** 刚勾选的条目先留在原位，300ms 后再沉到「已完成」（PRDv1.2.2 第 5.2 节）。 */
  const [justChecked, setJustChecked] = useState<Set<string>>(() => new Set());

  const dataVersion = useDataVersion();
  const statsRef = useRef(onStats);
  statsRef.current = onStats;

  const load = useCallback(async () => {
    const [taskList, memoList, courseList, term, periodTimes, sortMode, hide] = await Promise.all([
      listTasksByDate(date),
      listMemosByDate(date),
      listCourses(),
      getTermConfig(),
      getPeriodTimes(),
      getSortMode(),
      getHideCompleted(),
    ]);
    setTasks(taskList);
    setMemos(memoList);
    setCourses(coursesOnDate(date, courseList, term.startDate, periodTimes));
    setMode(sortMode);
    setHideCompleted(hide);
    statsRef.current?.({ total: taskList.length, done: taskList.filter((t) => t.done === 1).length });
  }, [date]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (dataVersion === 0) return;
    load().catch(() => undefined);
  }, [dataVersion, load]);

  // 刚勾选的任务暂时按未完成参与排序，避免列表在 300ms 内跳位。
  const sortingTasks = useMemo(
    () => tasks.map((task) => (justChecked.has(`task-${task.id}`) ? { ...task, done: 0 } : task)),
    [tasks, justChecked]
  );

  const items = useMemo(
    () => buildTodayItems(date, sortingTasks, memos, courses),
    [date, sortingTasks, memos, courses]
  );
  const sorted = useMemo(() => sortTodayItems(items, mode), [items, mode]);

  const taskByKey = useMemo(() => new Map(tasks.map((task) => [`task-${task.id}`, task])), [tasks]);
  const memoByKey = useMemo(() => new Map(memos.map((memo) => [`memo-${memo.id}`, memo])), [memos]);
  const courseByKey = useMemo(
    () => new Map(courses.map((course) => [`course-${course.slotId}`, course])),
    [courses]
  );

  const refresh = useCallback(async () => {
    await load();
    bumpDataVersion();
  }, [load]);

  const handleToggleTask = async (task: TaskRow) => {
    const nextDone = task.done === 1 ? 0 : 1;
    const key = `task-${task.id}`;
    // 先本地翻状态，勾选动画立刻可见；300ms 后再落库并重新排序。
    setTasks((list) => list.map((item) => (item.id === task.id ? { ...item, done: nextDone } : item)));
    setJustChecked((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
    await toggleTask(task.id);
    setTimeout(() => {
      setJustChecked(new Set());
      load().catch(() => undefined);
    }, 300);
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
          router.push({ pathname: '/timetable', params: { courseId: String(course.courseId) } })
        }
      />
    );
  };

  const isEmpty = sorted.active.length === 0 && (hideCompleted || sorted.completed.length === 0);

  return (
    <View>
      {isEmpty ? (
        <EmptyState
          text={emptyText ?? '这一天还没有安排'}
          hint={emptyHint ?? '点底部中间的「＋」添加任务或备忘'}
        />
      ) : null}

      {sorted.active.map((item, index) => (
        <StaggeredAppear key={item.key} index={index}>
          {renderRow(item)}
          <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
        </StaggeredAppear>
      ))}

      {!hideCompleted && sorted.completed.length > 0 ? (
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
                  <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
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
              setDeleting(menuTask ? { kind: 'task', id: menuTask.id, title: menuTask.title } : null),
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
    </View>
  );
}

const styles = StyleSheet.create({
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