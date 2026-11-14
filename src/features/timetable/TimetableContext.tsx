import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  getDb,
  ScheduleEntity,
  CourseEntity,
  SessionEntity,
  TimetableSettings,
  saveCourseWithSessions,
  deleteCourseWithSessions,
  PERIOD_TIMES_KEY,
  TIME_TABLES_KEY,
  SCHEDULE_TIMETABLE_MAP_KEY,
  parseTimeTables,
  parseScheduleTimeTableMap,
  writeTimeTables,
  writeScheduleTimeTableMap,
  writeActivePeriodTimes,
  samePeriods,
} from './repository';
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_RADIUS,
  DEFAULT_GRID_BACKGROUND,
  DEFAULT_PERIOD_TIMES,
  DEFAULT_WEEK_START_DAY,
  MAX_CELL_HEIGHT,
  MAX_CELL_RADIUS,
  MIN_CELL_HEIGHT,
  MIN_CELL_RADIUS,
  PeriodTime,
  TimeTablePreset,
  clampNumber,
  createLocalId,
  currentWeekNumber,
  getFirstMondayOfCurrentMonth,
} from '@/lib/timetable-core';
import { parseBoolSetting, serializeSettingValue } from '@/lib/settings-codec';
import { bumpDataVersion } from '@/lib/data-version';

interface TimetableContextValue {
  ready: boolean;
  schedules: ScheduleEntity[];
  activeSchedule: ScheduleEntity;
  courses: CourseEntity[];
  settings: TimetableSettings;
  viewingWeek: number;
  setViewingWeek: (week: number) => void;
  switchSchedule: (scheduleId: string) => Promise<void>;
  createOrUpdateSchedule: (payload: {
    id?: string;
    name: string;
    startDate: string;
    totalWeeks: number;
  }) => Promise<void>;
  deleteSchedule: (scheduleId: string) => Promise<{ ok: boolean; message?: string }>;
  saveCourse: (course: Omit<CourseEntity, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  duplicateCourse: (course: CourseEntity) => Promise<void>;
  importCoursesToActiveSchedule: (
    parsedCourses: {
      name: string;
      color: string;
      sessions: {
        dayOfWeek: number;
        startPeriod: number;
        endPeriod: number;
        weeks: number[];
        teacher: string;
        location: string;
      }[];
    }[]
  ) => Promise<void>;
  updateSetting: <K extends keyof TimetableSettings>(
    key: K,
    value: TimetableSettings[K]
  ) => Promise<void>;
  resetAppearanceDefaults: () => Promise<void>;
  /** 全部时间表（`timetable.timeTables`）。 */
  timeTables: TimeTablePreset[];
  /** 课表 ↔ 时间表绑定（`timetable.scheduleTimeTableMap`）。 */
  scheduleTimeTableMap: Record<string, string>;
  /** 当前激活课表正在使用的时间表（永远有值）。 */
  activeTimeTable: TimeTablePreset;
  /** 某张课表绑定的时间表 id；未绑定时回退到第一套。 */
  timeTableIdForSchedule: (scheduleId: string) => string;
  /** 把当前课表切换到指定时间表，并立刻回灌 `period.times` + bumpDataVersion。 */
  selectTimeTable: (timeTableId: string) => Promise<void>;
  /** 新增或更新一套时间表；若当前课表在用则同步回灌。 */
  saveTimeTable: (preset: TimeTablePreset) => Promise<void>;
  /** 新建一套以默认节次为模板的时间表并返回。 */
  createTimeTable: (name: string) => Promise<TimeTablePreset>;
  /** 删除一套时间表（至少保留一套；被删除的课表改绑到剩余第一套）。 */
  deleteTimeTable: (timeTableId: string) => Promise<{ ok: boolean; message?: string }>;
}

const TimetableContext = createContext<TimetableContextValue | null>(null);

/** `timetable.weekStartDay` 兜底解析：只接受 1 / 6 / 7，其余回落到周一。 */
function parseWeekStartDay(raw: string | undefined): 1 | 6 | 7 {
  const n = parseInt(raw || String(DEFAULT_WEEK_START_DAY), 10);
  return n === 6 || n === 7 ? n : DEFAULT_WEEK_START_DAY;
}

/**
 * `timetable.*` 布尔值兜底解析。
 *
 * 新写入统一是 '1' / '0'，但历史版本可能已经把 JS 布尔转成了 'true' / 'false'；
 * 若只认 `!== '0'`，`'false' !== '0'` 恒为 true，开关点一下关掉、刷新又弹回开启。
 */
const parseBool = parseBoolSetting;

export const TimetableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleEntity[]>([]);
  const [courses, setCourses] = useState<CourseEntity[]>([]);
  const [viewingWeek, setViewingWeek] = useState<number>(1);
  const [settings, setSettings] = useState<TimetableSettings>({
    activeScheduleId: '',
    periodTimes: DEFAULT_PERIOD_TIMES,
    periodDuration: 45,
    defaultSpan: 2,
    lunchAfter: 4,
    saturation: 0.8,
    reminderEnabled: false,
    weekStartDay: DEFAULT_WEEK_START_DAY,
    showSaturday: true,
    showSunday: true,
    cellHeight: DEFAULT_CELL_HEIGHT,
    cellRadius: DEFAULT_CELL_RADIUS,
    gridBackgroundColor: DEFAULT_GRID_BACKGROUND,
  });
  const [timeTables, setTimeTables] = useState<TimeTablePreset[]>([]);
  const [scheduleTimeTableMap, setScheduleTimeTableMap] = useState<Record<string, string>>({});

  /** 只在首次加载时把查看周对齐到当前周；后续 reloadAll（增删改后）不能把用户翻到的周拽回去。 */
  const initializedWeekRef = useRef(false);

  const reloadAll = useCallback(async () => {
    const db = await getDb();

    // 读取设置
    const settingRows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings WHERE key LIKE "timetable.%" OR key = "period.times";'
    );
    const map: Record<string, string> = {};
    settingRows.forEach((r) => {
      map[r.key] = r.value;
    });

    // 读取课表
    const schedRows = await db.getAllAsync<any>(
      'SELECT * FROM schedules ORDER BY created_at ASC;'
    );
    const loadedSchedules: ScheduleEntity[] = schedRows.map((r) => ({
      id: r.id,
      name: r.name,
      startDate: r.start_date,
      totalWeeks: r.total_weeks,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const activeId =
      loadedSchedules.find((s) => s.id === map['timetable.activeScheduleId'])?.id ||
      loadedSchedules[0]?.id ||
      '';

    // —— 多时间表：读取 / 补齐绑定 / 回灌 period.times ——
    let storedPeriods: PeriodTime[] = DEFAULT_PERIOD_TIMES;
    if (map[PERIOD_TIMES_KEY]) {
      try {
        const parsed = JSON.parse(map[PERIOD_TIMES_KEY]);
        if (Array.isArray(parsed) && parsed.length > 0) storedPeriods = parsed as PeriodTime[];
      } catch {
        storedPeriods = DEFAULT_PERIOD_TIMES;
      }
    }
    const storedDuration = parseInt(map['timetable.periodDuration'] || '45', 10) || 45;

    const loadedTimeTables = parseTimeTables(map[TIME_TABLES_KEY], storedPeriods, storedDuration);
    const loadedMap = parseScheduleTimeTableMap(map[SCHEDULE_TIMETABLE_MAP_KEY]);
    const presetIds = new Set(loadedTimeTables.map((p) => p.id));

    // 新建课表默认继承「当前课表」正在用的那套时间表，视觉上不会突然换节次时间。
    const activeBoundId =
      loadedTimeTables.find((p) => p.id === loadedMap[activeId])?.id ?? loadedTimeTables[0].id;

    let mapDirty = map[SCHEDULE_TIMETABLE_MAP_KEY] === undefined;
    for (const schedule of loadedSchedules) {
      const bound = loadedMap[schedule.id];
      if (!bound || !presetIds.has(bound)) {
        loadedMap[schedule.id] = activeBoundId;
        mapDirty = true;
      }
    }

    const activePreset =
      loadedTimeTables.find((p) => p.id === loadedMap[activeId]) ?? loadedTimeTables[0];
    const effectivePeriods = activePreset.periods;
    const effectiveDuration = activePreset.durationMinutes;

    // 铁律：当前课表绑定的时间表就是 `period.times` 的唯一来源。
    // 首页 / 今日计划 / 课表网格都读这一份，这里写回即三端同步。
    if (
      !samePeriods(storedPeriods, effectivePeriods) ||
      storedDuration !== effectiveDuration
    ) {
      await writeActivePeriodTimes(db, activePreset);
    }
    if (map[TIME_TABLES_KEY] === undefined) {
      await writeTimeTables(db, loadedTimeTables);
    }
    if (mapDirty) {
      await writeScheduleTimeTableMap(db, loadedMap);
    }

    const loadedSettings: TimetableSettings = {
      activeScheduleId: activeId,
      periodTimes: effectivePeriods,
      periodDuration: effectiveDuration,
      defaultSpan: parseInt(map['timetable.defaultSpan'] || '2', 10),
      lunchAfter: parseInt(map['timetable.lunchAfter'] ?? '4', 10),
      saturation: parseFloat(map['timetable.saturation'] ?? '0.8'),
      reminderEnabled: parseBool(map['timetable.reminderEnabled'], false),
      weekStartDay: parseWeekStartDay(map['timetable.weekStartDay']),
      showSaturday: parseBool(map['timetable.showSaturday'], true),
      showSunday: parseBool(map['timetable.showSunday'], true),
      cellHeight: clampNumber(
        parseInt(map['timetable.cellHeight'] || String(DEFAULT_CELL_HEIGHT), 10),
        MIN_CELL_HEIGHT,
        MAX_CELL_HEIGHT
      ),
      cellRadius: clampNumber(
        parseInt(map['timetable.cellRadius'] ?? String(DEFAULT_CELL_RADIUS), 10),
        MIN_CELL_RADIUS,
        MAX_CELL_RADIUS
      ),
      gridBackgroundColor: map['timetable.gridBackgroundColor'] || DEFAULT_GRID_BACKGROUND,
    };

    // 读取当前课表下的全部课程与时段
    const courseRows = await db.getAllAsync<any>(
      'SELECT * FROM sched_courses WHERE schedule_id = ? ORDER BY created_at ASC;',
      [activeId]
    );
    const sessionRows = await db.getAllAsync<any>('SELECT * FROM sched_sessions;');

    const loadedCourses: CourseEntity[] = courseRows.map((c) => {
      const cSessions: SessionEntity[] = sessionRows
        .filter((s) => s.course_id === c.id)
        .map((s) => ({
          id: s.id,
          courseId: s.course_id,
          teacher: s.teacher || '',
          location: s.location || '',
          dayOfWeek: s.day_of_week,
          startPeriod: s.start_period,
          endPeriod: s.end_period,
          weeks: s.weeks ? JSON.parse(s.weeks) : [],
          remark: s.remark || '',
          customTime: s.custom_time ? JSON.parse(s.custom_time) : undefined,
        }));

      return {
        id: c.id,
        scheduleId: c.schedule_id,
        name: c.name,
        color: c.color,
        credits: c.credits || '选填',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        sessions: cSessions,
      };
    });

    setSchedules(loadedSchedules);
    setSettings(loadedSettings);
    setCourses(loadedCourses);
    setTimeTables(loadedTimeTables);
    setScheduleTimeTableMap(loadedMap);

    const activeSched = loadedSchedules.find((s) => s.id === activeId) || loadedSchedules[0];
    if (activeSched && !initializedWeekRef.current) {
      initializedWeekRef.current = true;
      const cw = currentWeekNumber(activeSched.startDate, new Date());
      setViewingWeek(Math.min(Math.max(1, cw), activeSched.totalWeeks));
    }
    setReady(true);
    // 依赖留空：reloadAll 只写 state，不读 state；挂在 [ready] 上会让首帧多跑一整轮查询（进课表「卡一下」的来源之一）。
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const activeSchedule: ScheduleEntity =
    schedules.find((s) => s.id === settings.activeScheduleId) ||
    schedules[0] || {
      id: 'default',
      name: '我的课表',
      startDate: getFirstMondayOfCurrentMonth(new Date()),
      totalWeeks: 20,
      createdAt: '',
      updatedAt: '',
    };

  /** 首帧（还没加载完）时的兜底时间表，避免页面拿不到对象。 */
  const fallbackTimeTable: TimeTablePreset = {
    id: 'default',
    name: '默认',
    fixedDuration: false,
    durationMinutes: settings.periodDuration || 45,
    periods: settings.periodTimes,
  };

  const timeTableIdForSchedule = (scheduleId: string): string => {
    const bound = scheduleTimeTableMap[scheduleId];
    if (bound && timeTables.some((p) => p.id === bound)) return bound;
    return timeTables[0]?.id ?? 'default';
  };

  const activeTimeTable: TimeTablePreset =
    timeTables.find((p) => p.id === scheduleTimeTableMap[activeSchedule.id]) ??
    timeTables[0] ??
    fallbackTimeTable;

  const switchSchedule = async (scheduleId: string) => {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
      'timetable.activeScheduleId',
      scheduleId,
    ]);
    const target = schedules.find((s) => s.id === scheduleId);
    if (target) {
      const cw = currentWeekNumber(target.startDate, new Date());
      setViewingWeek(Math.min(Math.max(1, cw), target.totalWeeks));
    }
    await reloadAll();
    bumpDataVersion();
  };

  const createOrUpdateSchedule = async (payload: {
    id?: string;
    name: string;
    startDate: string;
    totalWeeks: number;
  }) => {
    const db = await getDb();
    const now = new Date().toISOString();
    if (payload.id) {
      await db.runAsync(
        'UPDATE schedules SET name = ?, start_date = ?, total_weeks = ?, updated_at = ? WHERE id = ?;',
        [payload.name, payload.startDate, payload.totalWeeks, now, payload.id]
      );
    } else {
      const newId = createLocalId('sched');
      await db.runAsync(
        'INSERT INTO schedules (id, name, start_date, total_weeks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
        [newId, payload.name, payload.startDate, payload.totalWeeks, now, now]
      );
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
        'timetable.activeScheduleId',
        newId,
      ]);
    }
    await reloadAll();
    bumpDataVersion();
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (schedules.length <= 1) {
      return { ok: false, message: '至少保留一张课表' };
    }
    const db = await getDb();
    const cRows = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM sched_courses WHERE schedule_id = ?;',
      [scheduleId]
    );
    for (const c of cRows) {
      await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [c.id]);
    }
    await db.runAsync('DELETE FROM sched_courses WHERE schedule_id = ?;', [scheduleId]);
    await db.runAsync('DELETE FROM schedules WHERE id = ?;', [scheduleId]);

    if (settings.activeScheduleId === scheduleId) {
      const remaining = schedules.filter((s) => s.id !== scheduleId);
      if (remaining[0]) {
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
          'timetable.activeScheduleId',
          remaining[0].id,
        ]);
      }
    }
    await reloadAll();
    bumpDataVersion();
    return { ok: true };
  };

  const saveCourse = async (course: Omit<CourseEntity, 'createdAt' | 'updatedAt'>) => {
    await saveCourseWithSessions(course);
    const firstWeek = course.sessions[0]?.weeks[0];
    if (firstWeek) {
      setViewingWeek(firstWeek);
    }
    await reloadAll();
    bumpDataVersion();
  };

  const deleteCourse = async (courseId: string) => {
    await deleteCourseWithSessions(courseId);
    await reloadAll();
    bumpDataVersion();
  };

  const duplicateCourse = async (course: CourseEntity) => {
    const newCourseId = createLocalId('c');
    const clonedSessions: SessionEntity[] = course.sessions.map((s) => ({
      ...s,
      id: createLocalId('s'),
      courseId: newCourseId,
    }));
    await saveCourse({
      id: newCourseId,
      scheduleId: course.scheduleId,
      name: `${course.name}副本`.slice(0, 30),
      color: course.color,
      credits: course.credits,
      sessions: clonedSessions,
    });
  };

  const importCoursesToActiveSchedule = async (
    parsedCourses: {
      name: string;
      color: string;
      sessions: {
        dayOfWeek: number;
        startPeriod: number;
        endPeriod: number;
        weeks: number[];
        teacher: string;
        location: string;
      }[];
    }[]
  ) => {
    const db = await getDb();
    const now = new Date().toISOString();
    const activeId = activeSchedule.id;

    await db.withTransactionAsync(async () => {
      // 覆盖当前课表的全部课程
      const oldCourses = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM sched_courses WHERE schedule_id = ?;',
        [activeId]
      );
      for (const oc of oldCourses) {
        await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [oc.id]);
      }
      await db.runAsync('DELETE FROM sched_courses WHERE schedule_id = ?;', [activeId]);

      for (let i = 0; i < parsedCourses.length; i++) {
        const pc = parsedCourses[i];
        const cId = createLocalId('c');
        await db.runAsync(
          'INSERT INTO sched_courses (id, schedule_id, name, color, credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [cId, activeId, pc.name, pc.color, '选填', now, now]
        );
        for (let j = 0; j < pc.sessions.length; j++) {
          const ps = pc.sessions[j];
          const sId = createLocalId('s');
          await db.runAsync(
            `INSERT INTO sched_sessions
              (id, course_id, teacher, location, day_of_week, start_period, end_period, weeks, remark, custom_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              sId,
              cId,
              ps.teacher,
              ps.location,
              ps.dayOfWeek,
              ps.startPeriod,
              ps.endPeriod,
              JSON.stringify(ps.weeks),
              '',
              '',
            ]
          );
        }
      }
    });
    await reloadAll();
    bumpDataVersion();
  };

  const updateSetting = async <K extends keyof TimetableSettings>(
    key: K,
    value: TimetableSettings[K]
  ) => {
    const db = await getDb();
    // 节次时间与主库共用 `period.times`，其余设置走 `timetable.*`。
    const dbKey = key === 'periodTimes' ? 'period.times' : `timetable.${key}`;
    // 布尔值必须落成 '1' / '0'：直接 String(false) 会写成 'false'，
    // 读回来就被当成 truthy，表现出来就是「开关点了没反应 / 刷新又复原」。
    const serialized = serializeSettingValue(value);
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
      dbKey,
      serialized,
    ]);
    await reloadAll();
    bumpDataVersion();
  };

  const resetAppearanceDefaults = async () => {
    const db = await getDb();
    // 外观 / 网格口径一次性回落到出厂值；节次时间不在其中（避免把用户的课表时间冲掉）。
    const defaults: Record<string, string> = {
      'timetable.saturation': '0.8',
      'timetable.lunchAfter': '4',
      'timetable.periodDuration': '45',
      'timetable.defaultSpan': '2',
      'timetable.weekStartDay': String(DEFAULT_WEEK_START_DAY),
      'timetable.showSaturday': '1',
      'timetable.showSunday': '1',
      'timetable.cellHeight': String(DEFAULT_CELL_HEIGHT),
      'timetable.cellRadius': String(DEFAULT_CELL_RADIUS),
      'timetable.gridBackgroundColor': DEFAULT_GRID_BACKGROUND,
    };
    for (const [key, value] of Object.entries(defaults)) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
        key,
        value,
      ]);
    }
    await reloadAll();
    bumpDataVersion();
  };

  /**
   * 切换当前课表使用的时间表。
   * 先写绑定与新节次，再 reloadAll + bumpDataVersion：
   * 首页 Tasks / 计划页 TodayList / 课表网格读到的 `period.times` 是同一份数据，不存在三端不一致。
   */
  const selectTimeTable = async (timeTableId: string) => {
    const preset = timeTables.find((p) => p.id === timeTableId);
    if (!preset) return;
    const db = await getDb();
    const nextMap = { ...scheduleTimeTableMap, [activeSchedule.id]: preset.id };
    await writeScheduleTimeTableMap(db, nextMap);
    await writeActivePeriodTimes(db, preset);
    await reloadAll();
    bumpDataVersion();
  };

  /** 新增 / 更新一套时间表；当前课表正在使用它时立刻回灌。 */
  const saveTimeTable = async (preset: TimeTablePreset) => {
    const db = await getDb();
    const exists = timeTables.some((p) => p.id === preset.id);
    const next = exists
      ? timeTables.map((p) => (p.id === preset.id ? preset : p))
      : [...timeTables, preset];
    await writeTimeTables(db, next);
    if (scheduleTimeTableMap[activeSchedule.id] === preset.id) {
      await writeActivePeriodTimes(db, preset);
    }
    await reloadAll();
    bumpDataVersion();
  };

  /** 以当前时间表为模板新建一套。 */
  const createTimeTable = async (name: string): Promise<TimeTablePreset> => {
    const template = activeTimeTable;
    const preset: TimeTablePreset = {
      id: createLocalId('tt'),
      name: name.trim() || `时间表 ${timeTables.length + 1}`,
      fixedDuration: template.fixedDuration,
      durationMinutes: template.durationMinutes,
      periods: template.periods.map((p) => ({ ...p })),
    };
    await saveTimeTable(preset);
    return preset;
  };

  /** 删除一套时间表；绑定它的课表统一改绑到剩余第一套。 */
  const deleteTimeTable = async (
    timeTableId: string
  ): Promise<{ ok: boolean; message?: string }> => {
    if (timeTables.length <= 1) return { ok: false, message: '至少保留一套时间表' };
    const remaining = timeTables.filter((p) => p.id !== timeTableId);
    const db = await getDb();
    await writeTimeTables(db, remaining);
    const nextMap: Record<string, string> = {};
    for (const [scheduleId, bound] of Object.entries(scheduleTimeTableMap)) {
      nextMap[scheduleId] = bound === timeTableId ? remaining[0].id : bound;
    }
    await writeScheduleTimeTableMap(db, nextMap);
    if (scheduleTimeTableMap[activeSchedule.id] === timeTableId) {
      await writeActivePeriodTimes(db, remaining[0]);
    }
    await reloadAll();
    bumpDataVersion();
    return { ok: true };
  };

  return (
    <TimetableContext.Provider
      value={{
        ready,
        schedules,
        activeSchedule,
        courses,
        settings,
        viewingWeek,
        setViewingWeek,
        switchSchedule,
        createOrUpdateSchedule,
        deleteSchedule,
        saveCourse,
        deleteCourse,
        duplicateCourse,
        importCoursesToActiveSchedule,
        updateSetting,
        resetAppearanceDefaults,
        timeTables,
        scheduleTimeTableMap,
        activeTimeTable,
        timeTableIdForSchedule,
        selectTimeTable,
        saveTimeTable,
        createTimeTable,
        deleteTimeTable,
      }}
    >
      {children}
    </TimetableContext.Provider>
  );
};

export function useTimetable(): TimetableContextValue {
  const ctx = useContext(TimetableContext);
  if (!ctx) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return ctx;
}
