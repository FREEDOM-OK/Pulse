import { getDriver } from '../connection';
import { listTasksByDate } from './tasks';
import { getDayExercises } from './training';
import { listEventsByDate } from './events';
import { listPlayedInRange } from './games';
import { listMemosByDate } from './memos';
import { listCourses } from './courses';
import { getPeriodTimes, getTermConfig } from './settings';
import { coursesOnDate, type CourseOnDate } from '@/lib/timetable';
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

/** 某一天的全部明细（日历回顾用）。 */
export async function getDayDetail(date: string): Promise<DayDetail> {
  const [tasks, fitness, events, games, memos, courses, term, periodTimes] = await Promise.all([
    listTasksByDate(date),
    getDayExercises(date),
    listEventsByDate(date),
    listPlayedInRange(date, date),
    listMemosByDate(date),
    listCourses(),
    getTermConfig(),
    getPeriodTimes(),
  ]);

  return {
    tasks,
    fitness,
    events,
    games,
    memos,
    courses: coursesOnDate(date, courses, term.startDate, periodTimes),
  };
}