import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getDb,
  ScheduleEntity,
  CourseEntity,
  SessionEntity,
  TimetableSettings,
} from './repository';
import {
  DEFAULT_PERIOD_TIMES,
  PeriodTime,
  currentWeekNumber,
  getFirstMondayOfCurrentMonth,
} from '@/lib/timetable-core';

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
    parsedCourses: Array<{
      name: string;
      color: string;
      sessions: Array<{
        dayOfWeek: number;
        startPeriod: number;
        endPeriod: number;
        weeks: number[];
        teacher: string;
        location: string;
      }>;
    }>
  ) => Promise<void>;
  updateSetting: <K extends keyof TimetableSettings>(
    key: K,
    value: TimetableSettings[K]
  ) => Promise<void>;
  resetAppearanceDefaults: () => Promise<void>;
}

const TimetableContext = createContext<TimetableContextValue | null>(null);

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
  });

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

    const loadedSettings: TimetableSettings = {
      activeScheduleId: activeId,
      periodTimes: map['period.times']
        ? JSON.parse(map['period.times'])
        : DEFAULT_PERIOD_TIMES,
      periodDuration: parseInt(map['timetable.periodDuration'] || '45', 10),
      defaultSpan: parseInt(map['timetable.defaultSpan'] || '2', 10),
      lunchAfter: parseInt(map['timetable.lunchAfter'] ?? '4', 10),
      saturation: parseFloat(map['timetable.saturation'] ?? '0.8'),
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

    const activeSched = loadedSchedules.find((s) => s.id === activeId) || loadedSchedules[0];
    if (activeSched && !ready) {
      const cw = currentWeekNumber(activeSched.startDate, new Date());
      setViewingWeek(Math.min(Math.max(1, cw), activeSched.totalWeeks));
    }
    setReady(true);
  }, [ready]);

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
      const newId = `sched_${Date.now()}`;
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
    return { ok: true };
  };

  const saveCourse = async (course: Omit<CourseEntity, 'createdAt' | 'updatedAt'>) => {
    const db = await getDb();
    const now = new Date().toISOString();
    const exists = courses.some((c) => c.id === course.id);

    if (exists) {
      await db.runAsync(
        'UPDATE sched_courses SET name = ?, color = ?, credits = ?, updated_at = ? WHERE id = ?;',
        [course.name, course.color, course.credits || '选填', now, course.id]
      );
      await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [course.id]);
    } else {
      await db.runAsync(
        'INSERT INTO sched_courses (id, schedule_id, name, color, credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [
          course.id,
          course.scheduleId,
          course.name,
          course.color,
          course.credits || '选填',
          now,
          now,
        ]
      );
    }

    for (const s of course.sessions) {
      await db.runAsync(
        `INSERT OR REPLACE INTO sched_sessions
          (id, course_id, teacher, location, day_of_week, start_period, end_period, weeks, remark, custom_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          s.id,
          course.id,
          s.teacher || '',
          s.location || '',
          s.dayOfWeek,
          s.startPeriod,
          s.endPeriod,
          JSON.stringify(s.weeks),
          s.remark || '',
          s.customTime ? JSON.stringify(s.customTime) : '',
        ]
      );
    }

    const firstWeek = course.sessions[0]?.weeks[0];
    if (firstWeek) {
      setViewingWeek(firstWeek);
    }
    await reloadAll();
  };

  const deleteCourse = async (courseId: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [courseId]);
    await db.runAsync('DELETE FROM sched_courses WHERE id = ?;', [courseId]);
    await reloadAll();
  };

  const duplicateCourse = async (course: CourseEntity) => {
    const newCourseId = `c_${Date.now()}`;
    const clonedSessions: SessionEntity[] = course.sessions.map((s, idx) => ({
      ...s,
      id: `s_${Date.now()}_${idx}`,
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
    parsedCourses: Array<{
      name: string;
      color: string;
      sessions: Array<{
        dayOfWeek: number;
        startPeriod: number;
        endPeriod: number;
        weeks: number[];
        teacher: string;
        location: string;
      }>;
    }>
  ) => {
    const db = await getDb();
    const now = new Date().toISOString();
    const activeId = activeSchedule.id;

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
      const cId = `c_${Date.now()}_${i}`;
      await db.runAsync(
        'INSERT INTO sched_courses (id, schedule_id, name, color, credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [cId, activeId, pc.name, pc.color, '选填', now, now]
      );
      for (let j = 0; j < pc.sessions.length; j++) {
        const ps = pc.sessions[j];
        const sId = `s_${Date.now()}_${i}_${j}`;
        await db.runAsync(
          `INSERT OR REPLACE INTO sched_sessions
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
    await reloadAll();
  };

  const updateSetting = async <K extends keyof TimetableSettings>(
    key: K,
    value: TimetableSettings[K]
  ) => {
    const db = await getDb();
    // 节次时间与主库共用 `period.times`，其余设置走 `timetable.*`。
    const dbKey = key === 'periodTimes' ? 'period.times' : `timetable.${key}`;
    const serialized =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
      dbKey,
      serialized,
    ]);
    await reloadAll();
  };

  const resetAppearanceDefaults = async () => {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
      'timetable.saturation',
      '0.8',
    ]);
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
      'timetable.lunchAfter',
      '4',
    ]);
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
      'timetable.periodDuration',
      '45',
    ]);
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
      'timetable.defaultSpan',
      '2',
    ]);
    await reloadAll();
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
