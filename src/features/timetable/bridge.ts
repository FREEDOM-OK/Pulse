/**
 * 课表 → 今日计划/首页的桥接查询。
 *
 * 首页卡片、今日计划、日历回顾只需要「某一天有哪些课」，
 * 这里把新课表（Schedule/课程/时段）折算成旧结构 CourseOnDate，
 * 让这些页面不必了解课表内部表结构。
 */
import { getDb } from './repository';
import {
  PeriodTime,
  currentWeekNumber,
  isActiveOn,
  formatMD,
} from '@/lib/timetable-core';

/** ISO 日期 → 1=周一 … 7=周日。 */
function weekdayOfIso(date: string): number {
  const day = new Date(date).getDay();
  return day === 0 ? 7 : day;
}

export interface CourseOnDate {
  /** 课程 id（字符串，课表主键是 TEXT）。 */
  courseId: string;
  /** 时段 id，用于今日列表的稳定 key。 */
  slotId: string;
  name: string;
  color: string;
  /** 1=周一 … 7=周日。 */
  weekday: number;
  startPeriod: number;
  endPeriod: number;
  /** `08:00 – 09:40` */
  time: string;
  teacher?: string;
  room?: string;
}

interface ScheduleMeta {
  id: string;
  startDate: string;
  totalWeeks: number;
  periodTimes: PeriodTime[];
}

async function loadMeta(): Promise<ScheduleMeta | null> {
  const db = await getDb();
  const active = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'timetable.activeScheduleId';"
  );
  const rows = await db.getAllAsync<{ id: string; start_date: string; total_weeks: number }>(
    'SELECT id, start_date, total_weeks FROM schedules ORDER BY created_at ASC;'
  );
  const schedule = rows.find((r) => r.id === active?.value) ?? rows[0];
  if (!schedule) return null;

  const timesRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'period.times';"
  );
  let periodTimes: PeriodTime[] = [];
  if (timesRow?.value) {
    try {
      const parsed = JSON.parse(timesRow.value);
      if (Array.isArray(parsed)) periodTimes = parsed as PeriodTime[];
    } catch {
      periodTimes = [];
    }
  }
  return {
    id: schedule.id,
    startDate: schedule.start_date,
    totalWeeks: schedule.total_weeks,
    periodTimes,
  };
}

function timeRange(periodTimes: PeriodTime[], startPeriod: number, endPeriod: number): string {
  const start = periodTimes[startPeriod - 1]?.start ?? '';
  const end = periodTimes[endPeriod - 1]?.end ?? '';
  if (!start || !end) return '';
  return `${start} – ${end}`;
}

/** 某一天要上的课，按开始节次排序。 */
export async function listCoursesForDate(date: string): Promise<CourseOnDate[]> {
  const meta = await loadMeta();
  if (!meta) return [];

  const week = currentWeekNumber(meta.startDate, new Date(date));
  if (week < 1 || week > meta.totalWeeks) return [];
  const weekday = weekdayOfIso(date);

  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    course_id: string;
    teacher: string | null;
    location: string | null;
    day_of_week: number;
    start_period: number;
    end_period: number;
    weeks: string | null;
    custom_time: string | null;
    name: string;
    color: string;
  }>(
    `SELECT s.id, s.course_id, s.teacher, s.location, s.day_of_week, s.start_period,
            s.end_period, s.weeks, s.custom_time, c.name, c.color
       FROM sched_sessions s
       JOIN sched_courses c ON c.id = s.course_id
      WHERE c.schedule_id = ? AND s.day_of_week = ?
      ORDER BY s.start_period ASC;`,
    [meta.id, weekday]
  );

  const result: CourseOnDate[] = [];
  for (const row of rows) {
    let weeks: number[] = [];
    if (row.weeks) {
      try {
        const parsed = JSON.parse(row.weeks);
        if (Array.isArray(parsed)) weeks = parsed as number[];
      } catch {
        weeks = [];
      }
    }
    if (!isActiveOn(weeks, week)) continue;

    let time = timeRange(meta.periodTimes, row.start_period, row.end_period);
    if (row.custom_time) {
      try {
        const custom = JSON.parse(row.custom_time) as {
          enabled?: boolean;
          startTime?: string;
          endTime?: string;
        };
        if (custom.enabled && custom.startTime && custom.endTime) {
          time = `${custom.startTime} – ${custom.endTime}`;
        }
      } catch {
        // 自定义时间损坏时忽略，继续用节次时间。
      }
    }

    result.push({
      courseId: row.course_id,
      slotId: row.id,
      name: row.name,
      color: row.color,
      weekday: row.day_of_week,
      startPeriod: row.start_period,
      endPeriod: row.end_period,
      time,
      teacher: row.teacher || undefined,
      room: row.location || undefined,
    });
  }
  return result.sort((a, b) => a.startPeriod - b.startPeriod);
}

/** 今天有没有课 / 一共几节，供首页课表卡使用。 */
export async function getTodayCourses(today: string): Promise<{
  count: number;
  next: CourseOnDate | null;
  dateLabel: string;
}> {
  const courses = await listCoursesForDate(today);
  return {
    count: courses.length,
    next: courses[0] ?? null,
    dateLabel: formatMD(new Date(today)),
  };
}