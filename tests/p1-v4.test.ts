import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests, getDriver } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  createMemo,
  deleteMemo,
  listMemosByDate,
  toggleMemoPin,
  updateMemo,
} from '@/db/repositories/memos';
import {
  createCourse,
  deleteCourse,
  findSlotConflict,
  getCourse,
  listCourses,
  updateCourse,
} from '@/db/repositories/courses';
import { createTask, listTasksByDate, setTaskPinned } from '@/db/repositories/tasks';
import {
  getHomeCards,
  getPeriodTimes,
  getSortMode,
  getTermConfig,
  setHomeCards,
  setSetting,
  setSortMode,
  setTermConfig,
} from '@/db/repositories/settings';
import {
  BACKUP_VERSION,
  clearAllData,
  exportBackup,
  importBackup,
  parseBackupPayload,
} from '@/db/repositories/backup';
import { migrateLegacyQuickMemo, QUICK_MEMO_KEY } from '@/db/migrations-v4';
import {
  coursesOnDate,
  isSlotActive,
  periodsOverlap,
  weekOfTerm,
  weeksOverlap,
} from '@/lib/timetable';
import { todayStr } from '@/lib/date';

const DATE = '2026-11-09';

afterEach(() => {
  resetDriverForTests();
});

describe('P0 schema v4', () => {
  it('tasks 表有 pinned 列，且默认 0', async () => {
    await createTestContext();
    const columns = await getDriver().getAllAsync<{ name: string; dflt_value: string | null }>(
      'PRAGMA table_info(tasks)'
    );
    const pinned = columns.find((column) => column.name === 'pinned');
    expect(pinned).toBeDefined();
    expect(Number(pinned?.dflt_value)).toBe(0);
  });

  it('新建任务可置顶，setTaskPinned 可切换', async () => {
    await createTestContext();
    const id = await createTask({ date: DATE, title: '置顶任务', pinned: true });
    const rows = await listTasksByDate(DATE);
    expect(rows[0].pinned).toBe(1);

    await setTaskPinned(id, false);
    expect((await listTasksByDate(DATE))[0].pinned).toBe(0);
  });
});

describe('P0 备忘仓库', () => {
  it('新建按 sort_order 递增，置顶项排在前面', async () => {
    await createTestContext();
    await createMemo({ date: DATE, content: '第一条' });
    const second = await createMemo({ date: DATE, content: '第二条' });
    await createMemo({ date: DATE, content: '第三條置顶', pinned: true });

    const rows = await listMemosByDate(DATE);
    expect(rows.map((row) => row.content)).toEqual(['第三條置顶', '第一条', '第二条']);
    expect(rows[0].pinned).toBe(1);

    expect(await toggleMemoPin(second)).toBe(true);
    expect((await listMemosByDate(DATE))[0].pinned).toBe(1);
  });

  it('更新内容与时间、删除备忘', async () => {
    await createTestContext();
    const id = await createMemo({ date: DATE, content: '旧内容' });
    await updateMemo(id, { content: '新内容', time: '09:30' });

    const [memo] = await listMemosByDate(DATE);
    expect(memo.content).toBe('新内容');
    expect(memo.time).toBe('09:30');
    expect(memo.updated_at >= memo.created_at).toBe(true);

    await deleteMemo(id);
    expect(await listMemosByDate(DATE)).toEqual([]);
  });
});

describe('P0 课表仓库', () => {
  it('创建课程带多个时段，可读回并按星期与节次排序', async () => {
    await createTestContext();
    const id = await createCourse({
      name: '高等数学',
      teacher: '张老师',
      room: 'A301',
      color: '#4C8DF6',
      slots: [
        { weekday: 3, startPeriod: 5, endPeriod: 6, weeks: [1, 3, 5] },
        { weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [] },
      ],
    });

    const course = await getCourse(id);
    expect(course?.name).toBe('高等数学');
    expect(course?.slots.map((slot) => slot.weekday)).toEqual([1, 3]);
    expect(course?.slots[0].weeks).toEqual([]);
    expect(course?.slots[1].weeks).toEqual([1, 3, 5]);
  });

  it('更新课程会替换时段，删除课程会清掉时段', async () => {
    await createTestContext();
    const id = await createCourse({
      name: '英语',
      slots: [{ weekday: 2, startPeriod: 1, endPeriod: 2, weeks: [] }],
    });

    await updateCourse(id, {
      name: '英语（进阶）',
      slots: [{ weekday: 4, startPeriod: 3, endPeriod: 4, weeks: [2, 4] }],
    });

    const course = await getCourse(id);
    expect(course?.name).toBe('英语（进阶）');
    expect(course?.slots).toHaveLength(1);
    expect(course?.slots[0].weekday).toBe(4);

    await deleteCourse(id);
    expect(await listCourses()).toEqual([]);
    const slotCount = await getDriver().getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM course_slots'
    );
    expect(Number(slotCount?.total)).toBe(0);
  });

  it('冲突检测：同星期同节次同周次算冲突，周次或节次不重叠不算', async () => {
    await createTestContext();
    await createCourse({
      name: '高数',
      slots: [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 3, 5] }],
    });

    expect(
      await findSlotConflict({ weekday: 1, startPeriod: 2, endPeriod: 3, weeks: [3] })
    ).toMatchObject({ name: '高数' });
    expect(
      await findSlotConflict({ weekday: 1, startPeriod: 3, endPeriod: 4, weeks: [3] })
    ).toBeNull();
    expect(
      await findSlotConflict({ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [2] })
    ).toBeNull();
    expect(
      await findSlotConflict({ weekday: 2, startPeriod: 1, endPeriod: 2, weeks: [3] })
    ).toBeNull();
  });
});

describe('P0 设置扩展', () => {
  it('首页卡片默认只开启健身/游戏/日历，课表关闭', async () => {
    await createTestContext();
    expect(await getHomeCards()).toEqual(['fitness', 'games', 'calendar']);
  });

  it('首页卡片可保存并过滤非法值，空数组回默认', async () => {
    await createTestContext();
    await setHomeCards(['timetable', 'fitness', 'timetable']);
    expect(await getHomeCards()).toEqual(['timetable', 'fitness']);

    await setSetting('home.cards', JSON.stringify(['unknown']));
    expect(await getHomeCards()).toEqual(['fitness', 'games', 'calendar']);
  });

  it('排序模式默认备忘在前，非法值也回备忘在前', async () => {
    await createTestContext();
    expect(await getSortMode()).toBe('memo-first');
    await setSortMode('mixed');
    expect(await getSortMode()).toBe('mixed');
    await setSetting('today.sortMode', 'nope');
    expect(await getSortMode()).toBe('memo-first');
  });

  it('学期配置默认未设置开始日、18 周', async () => {
    await createTestContext();
    expect(await getTermConfig()).toEqual({ startDate: null, totalWeeks: 18 });
    await setTermConfig({ startDate: '2026-09-07', totalWeeks: 20 });
    expect(await getTermConfig()).toEqual({ startDate: '2026-09-07', totalWeeks: 20 });
  });

  it('节次时间默认 11 节且带起止时间', async () => {
    await createTestContext();
    const times = await getPeriodTimes();
    expect(times).toHaveLength(11);
    expect(times[0]).toEqual({ start: '08:00', end: '08:45' });
  });
});

describe('P0 快速备忘迁移', () => {
  it('settings 里的 memo.quick 会变成今天一条置顶备忘并删除旧键', async () => {
    await createTestContext();
    await setSetting(QUICK_MEMO_KEY, '记一下买牛奶');

    await migrateLegacyQuickMemo();

    const memos = await listMemosByDate(todayStr());
    expect(memos).toHaveLength(1);
    expect(memos[0]).toMatchObject({ content: '记一下买牛奶', pinned: 1, time: null });

    const oldKey = await getDriver().getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [QUICK_MEMO_KEY]
    );
    expect(oldKey).toBeNull();
  });

  it('没有旧备忘时不插入空备忘，重复执行幂等', async () => {
    await createTestContext();
    await migrateLegacyQuickMemo();
    expect(await listMemosByDate(todayStr())).toEqual([]);

    await setSetting(QUICK_MEMO_KEY, '   ');
    await migrateLegacyQuickMemo();
    expect(await listMemosByDate(todayStr())).toEqual([]);
  });
});

describe('P0 课表推演（纯函数）', () => {
  it('weekOfTerm 以学期起始日为第 1 周', () => {
    expect(weekOfTerm('2026-09-07', '2026-09-07')).toBe(1);
    expect(weekOfTerm('2026-09-13', '2026-09-07')).toBe(1);
    expect(weekOfTerm('2026-09-14', '2026-09-07')).toBe(2);
    expect(weekOfTerm('2026-09-07', null)).toBe(1);
    expect(weekOfTerm('2026-08-01', '2026-09-07')).toBe(1);
  });

  it('isSlotActive 空周次表示每周', () => {
    expect(isSlotActive([], 7)).toBe(true);
    expect(isSlotActive([1, 3], 3)).toBe(true);
    expect(isSlotActive([1, 3], 4)).toBe(false);
  });

  it('weeksOverlap 任一方为空视为有交集', () => {
    expect(weeksOverlap([], [1])).toBe(true);
    expect(weeksOverlap([1, 3], [3, 5])).toBe(true);
    expect(weeksOverlap([1, 3], [2, 4])).toBe(false);
  });

  it('periodsOverlap 共享同一节算重叠', () => {
    expect(periodsOverlap({ start: 1, end: 2 }, { start: 2, end: 3 })).toBe(true);
    expect(periodsOverlap({ start: 1, end: 2 }, { start: 3, end: 4 })).toBe(false);
  });

  it('coursesOnDate 按星期与周次过滤并排序', async () => {
    const courses = [
      {
        id: 1,
        name: '高数',
        color: '#4C8DF6',
        slots: [
          { id: 11, weekday: 1, startPeriod: 3, endPeriod: 4, weeks: [1] },
          { id: 12, weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [] },
          { id: 13, weekday: 1, startPeriod: 5, endPeriod: 6, weeks: [2] },
        ],
      },
    ];
    const rows = coursesOnDate('2026-11-09', courses, '2026-11-09', [
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
      { start: '10:00', end: '10:45' },
    ]);

    expect(rows.map((row) => row.slotId)).toEqual([12, 11]);
    expect(rows[0].time).toBe('08:00 – 09:40');
    expect(rows[1].courseId).toBe(1);
  });
});

describe('P0 备份 v4', () => {
  it('备忘、课程与时段能完整导出并恢复', async () => {
    await createTestContext();
    await createMemo({ date: DATE, content: '备忘一', time: '08:00', pinned: true });
    await createCourse({
      name: '物理',
      teacher: '李老师',
      slots: [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2] }],
    });
    await createTask({ date: DATE, title: '带置顶的任务', pinned: true });

    const before = await exportBackup();
    expect(before.schemaVersion).toBe(BACKUP_VERSION);
    expect(before.data.memos).toHaveLength(1);
    expect(before.data.courses).toHaveLength(1);
    expect(before.data.courseSlots).toHaveLength(1);
    expect(before.data.tasks[0]).toMatchObject({ pinned: 1 });

    await clearAllData();
    await importBackup(parseBackupPayload(JSON.parse(JSON.stringify(before))));

    const after = await exportBackup();
    expect(after.data.memos).toEqual(before.data.memos);
    expect(after.data.courses).toEqual(before.data.courses);
    expect(after.data.courseSlots).toEqual(before.data.courseSlots);
    expect(after.data.tasks).toEqual(before.data.tasks);

    const course = (await listCourses())[0];
    expect(course.slots[0]).toMatchObject({ weekday: 1, startPeriod: 1, weeks: [1, 2] });
  });

  it('v3 备份没有新数组时导入为空，不报错', async () => {
    await createTestContext();
    const payload = parseBackupPayload({
      app: 'my-life-app',
      schemaVersion: 3,
      exportedAt: '',
      data: {
        tasks: [],
        exercises: [],
        trainingItems: [],
        setRecords: [],
        wishlist: [],
        playedGames: [],
        events: [],
        settings: {},
      },
    });

    expect(payload.data.memos).toEqual([]);
    expect(payload.data.courses).toEqual([]);
    expect(payload.data.courseSlots).toEqual([]);
    await importBackup(payload);
    expect(await listCourses()).toEqual([]);
  });
});