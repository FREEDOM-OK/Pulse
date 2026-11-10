import { getDriver } from '../connection';
import { listTasksByDate } from './tasks';
import { getDayExercises } from './training';
import { listEventsByDate } from './events';
import { listPlayedInRange } from './games';
import { listMemosByDate } from './memos';
import { listCoursesForDate, type CourseOnDate } from '@/features/timetable/bridge';
import type { EventRow, MemoRow, PlayedGameRow, TaskRow } from '../types';

export interface DayFlags {
  tasks: boolean;
  fitness: boolean;
  events: boolean;
  games: boolean;
}

export interface DayDetail {
  tasks: TaskRow[];
  fitness: { exerciseName: string; sets: number }[];
  events: EventRow[];
  games: PlayedGameRow[];
  memos: MemoRow[];
  courses: CourseOnDate[];
}

/** 某个月每一天有哪些模块的数据（日历色点用）。 */
export async function getMonthActivity(
  from: string,
  to: string
): Promise<Record<string, DayFlags>> {
  const driver = getDriver();

  const [taskRows, setRows, eventRows, gameRows] = await Promise.all([
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM tasks WHERE date BETWEEN ? AND ?',
      [from, to]
    ),
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM set_records WHERE date BETWEEN ? AND ?',
      [from, to]
    ),
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM events WHERE date BETWEEN ? AND ?',
      [from, to]
    ),
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT played_date AS date FROM played_games WHERE played_date BETWEEN ? AND ?',
      [from, to]
    ),
  ]);

  const flags: Record<string, DayFlags> = {};
  const ensure = (date: string): DayFlags => {
    flags[date] ??= { tasks: false, fitness: false, events: false, games: false };
    return flags[date];
  };

  for (const row of taskRows) ensure(row.date).tasks = true;
  for (const row of setRows) ensure(row.date).fitness = true;
  for (const row of eventRows) ensure(row.date).events = true;
  for (const row of gameRows) ensure(row.date).games = true;

  return flags;
}

/** 区间内的记录条数（首页日历卡「本月 N 条 · 今天 N 条」用）。 */
export async function countRecordsInRange(from: string, to: string): Promise<number> {
  const driver = getDriver();
  const count = async (sql: string) => {
    const row = await driver.getFirstAsync<{ n: number }>(sql, [from, to]);
    return row?.n ?? 0;
  };

  const [tasks, memos, events, games, sets] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM tasks WHERE date BETWEEN ? AND ?'),
    count('SELECT COUNT(*) AS n FROM memos WHERE date BETWEEN ? AND ?'),
    count('SELECT COUNT(*) AS n FROM events WHERE date BETWEEN ? AND ?'),
    count('SELECT COUNT(*) AS n FROM played_games WHERE played_date BETWEEN ? AND ?'),
    count('SELECT COUNT(*) AS n FROM set_records WHERE date BETWEEN ? AND ?'),
  ]);

  return tasks + memos + events + games + sets;
}

/** 某一天的全部明细（日历回顾用）。 */
export async function getDayDetail(date: string): Promise<DayDetail> {
  const [tasks, fitness, events, games, memos, courses] = await Promise.all([
    listTasksByDate(date),
    getDayExercises(date),
    listEventsByDate(date),
    listPlayedInRange(date, date),
    listMemosByDate(date),
    listCoursesForDate(date),
  ]);

  return {
    tasks,
    fitness,
    events,
    games,
    memos,
    courses,
  };
}