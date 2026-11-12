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
import {
  DEFAULT_SATURATION,
  getHideCompleted,
  getSortMode,
  getTimetableSettings,
} from '@/db/repositories/settings';
import { deleteTask, listTasksByDate, toggleTask } from '@/db/repositories/tasks';
import type { MemoRow, SortMode, TaskRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion, useDataVersion } from '@/lib/data-version';
import { listCoursesForDate, type CourseOnDate } from '@/features/timetable/bridge';
import { buildTodayItems } from '@/lib/today-items';
import { sortTodayItems, type TodayItem } from '@/lib/today-sort';
import { softenColor } from '@/lib/timetable-core';

type DeleteTarget = { kind: 'task' | 'memo'; id: number; title: string } | null;

export interface TodayListProps {
  date: string;
  emptyText?: string;
  emptyHint?: string;
  /** 只列任务，不混入备忘 / 课表。 */
  onlyTasks?: boolean;
  /** 每行底部留白；首页用 16。 */
  rowSpacing?: number;
  /** 是否显示行间分隔线。 */
  showSeparators?: boolean;
  /** 是否显示底部「＋ 新建」入口。 */
  showAddRow?: boolean;
  /** 勾选框形状；首页 Tasks 用方形圆角。 */
  checkShape?: 'square' | 'circle';
  /** 勾选框边长，默认 22；首页用 20。 */
  checkSize?: number;
  /** 方形勾选框圆角，默认 7；首页用 6。 */
  checkRadius?: number;
  /** 未勾选时的描边色。 */
  checkBorderColor?: string;
  /** 勾选后的填充色。 */
  checkCheckedColor?: string;
  /** 对勾颜色。 */
  checkCheckColor?: string;
  /** 首页课程行：绿色圆点、无右箭头、固定文字色。 */
  courseVariant?: 'default' | 'home';
  /** 固定浅色页面（首页）的标题色；不传则跟随主题。 */
  textColor?: string;
  /** 固定浅色页面（首页）的备注/时间/空态文字色。 */
  secondaryTextColor?: string;
  /** 数据变化后回传任务完成情况，供页面头部显示「完成 x/y」。 */
  onStats?: (stats: { total: number; done: number }) => void;
}

/**
 * 任务 + 备忘 + 课表派生行的混合列表。
 * 首页 Tasks 与今日计划共用同一组件与同一排序逻辑（PRD 3.3 / 5.1）。
 */
export function TodayList({
  date,
  emptyText,
  emptyHint,
  onlyTasks = false,
  rowSpacing = 0,
  showSeparators = true,
  showAddRow = true,
  checkShape = 'square',
  checkSize = 22,
  checkRadius,
  checkBorderColor,
  checkCheckedColor,
  checkCheckColor,
  courseVariant = 'default',
  textColor,
  secondaryTextColor,
  onStats,
}: TodayListProps) {
  const theme = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [memos, setMemos] = useState<MemoRow[]>([]);
  const [courses, setCourses] = useState<CourseOnDate[]>([]);
  const [mode, setMode] = useState<SortMode>('memo-first');
  /** 与课表卡片同一套饱和度，保证课程圆点和课表里的颜色一致。 */
  const [courseSaturation, setCourseSaturation] = useState(DEFAULT_SATURATION);

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [menuTask, setMenuTask] = useState<TaskRow | null>(null);

  const [memoFormOpen, setMemoFormOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoRow | null>(null);
  const [menuMemo, setMenuMemo] = useState<MemoRow | null>(null);

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget>(null);
  const [hideCompleted, setHideCompleted] = useState(false);
  /** 刚勾选的条目先留在原位，300ms 后再沉到列表底部。 */
  const [justChecked, setJustChecked] = useState<Set<string>>(() => new Set());

  const dataVersion = useDataVersion();
  const statsRef = useRef(onStats);
  statsRef.current = onStats;

  const load = useCallback(async () => {
    const [taskList, memoList, courseList, sortMode, hide, timetable] = await Promise.all([
      listTasksByDate(date),
      listMemosByDate(date),
      listCoursesForDate(date),
      getSortMode(),
      getHideCompleted(),
      getTimetableSettings(),
    ]);
    setTasks(taskList);
    setMemos(memoList);
    setCourses(courseList);
    setMode(sortMode);
    setHideCompleted(hide);
    setCourseSaturation(timetable.saturation);
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

  const items = useMemo(() => {
    const all = buildTodayItems(date, sortingTasks, memos, courses);
    if (onlyTasks) return all.filter((item) => item.kind === 'task');
    return all;
  }, [date, sortingTasks, memos, courses, onlyTasks]);
  // 完成项不再单独分组：排序后直接接在未完成项后面，整个列表保持平铺。
  const sorted = useMemo(() => sortTodayItems(items, mode), [items, mode]);
  const flatItems = useMemo(
    () => [...sorted.active, ...sorted.completed],
    [sorted.active, sorted.completed]
  );
  const visibleItems = useMemo(
    () =>
      hideCompleted
        ? flatItems.filter((item) => !(item.kind === 'task' && item.done))
        : flatItems,
    [flatItems, hideCompleted]
  );

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
    // 首页与「计划」页各自挂着一个 TodayList；写库后必须广播版本，
    // 否则另一个 Tab 保持挂载时不会重新读取，勾选状态就会不一致。
    bumpDataVersion();
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
          checkShape={checkShape}
          checkSize={checkSize}
          checkRadius={checkRadius}
          checkBorderColor={checkBorderColor}
          checkCheckedColor={checkCheckedColor}
          checkCheckColor={checkCheckColor}
          titleColor={textColor}
          metaColor={secondaryTextColor}
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
      return (
        <MemoRowItem
          memo={memo}
          titleColor={textColor}
          metaColor={secondaryTextColor}
          dotColor={secondaryTextColor}
          onMenu={() => setMenuMemo(memo)}
        />
      );
    }
    const course = courseByKey.get(item.key);
    if (!course) return null;
    return (
      <CourseRowItem
        course={course}
        variant={courseVariant}
        titleColor={textColor}
        metaColor={secondaryTextColor}
        dotColor={softenColor(course.color, courseSaturation)}
        onPress={() =>
          router.push({ pathname: '/timetable', params: { courseId: String(course.courseId) } })
        }
      />
    );
  };

  const isEmpty = visibleItems.length === 0;

  return (
    <View>
      {isEmpty ? (
        <EmptyState
          text={emptyText ?? '这一天还没有安排'}
          hint={emptyHint ?? '点底部中间的「＋」添加任务或备忘'}
          textColor={secondaryTextColor}
          hintColor={secondaryTextColor}
        />
      ) : null}

      {visibleItems.map((item, index) => (
        <StaggeredAppear key={item.key} index={index}>
          <View style={rowSpacing > 0 ? { marginBottom: rowSpacing } : undefined}>
            {renderRow(item)}
            {showSeparators ? (
              <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
            ) : null}
          </View>
        </StaggeredAppear>
      ))}

      {showAddRow ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="新建任务或备忘"
          onPress={() => setNewMenuOpen(true)}
          style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={secondaryTextColor ? { color: secondaryTextColor } : undefined}>
            ＋ 新建
          </ThemedText>
        </Pressable>
      ) : null}

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
  addRow: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});