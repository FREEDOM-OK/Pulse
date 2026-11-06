import { getDriver } from '../connection';
import { listTasksByDate } from './tasks';
import { getDayExercises } from './training';
import { getTotalCalories, listDietByDate } from './diet';
import { listPlayedInRange } from './games';
import type { DietRecordRow, PlayedGameRow, TaskRow } from '../types';

export interface DayFlags {
  tasks: boolean;
  fitness: boolean;
  diet: boolean;
  games: boolean;
}

export interface DayDetail {
  tasks: TaskRow[];
  fitness: { exerciseName: string; sets: number }[];
  diet: { records: DietRecordRow[]; totalCalories: number };
  games: PlayedGameRow[];
}

/** 某个月每一天有哪些模块的数据（日历色点用）。 */
export async function getMonthActivity(
  from: string,
  to: string
): Promise<Record<string, DayFlags>> {
  const driver = getDriver();

  const [taskRows, setRows, dietRows, gameRows] = await Promise.all([
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM tasks WHERE date BETWEEN ? AND ?',
      [from, to]
    ),
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM set_records WHERE date BETWEEN ? AND ?',
      [from, to]
    ),
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM diet_records WHERE date BETWEEN ? AND ?',
      [from, to]
    ),
    driver.getAllAsync<{ date: string }>(
      'SELECT DISTINCT played_date AS date FROM played_games WHERE played_date BETWEEN ? AND ?',
      [from, to]
    ),
  ]);

  const flags: Record<string, DayFlags> = {};
  const ensure = (date: string): DayFlags => {
    flags[date] ??= { tasks: false, fitness: false, diet: false, games: false };
    return flags[date];
  };

  for (const row of taskRows) ensure(row.date).tasks = true;
  for (const row of setRows) ensure(row.date).fitness = true;
  for (const row of dietRows) ensure(row.date).diet = true;
  for (const row of gameRows) ensure(row.date).games = true;

  return flags;
}

/** 某一天的全部明细（日历回顾用）。 */
export async function getDayDetail(date: string): Promise<DayDetail> {
  const [tasks, fitness, diet, games] = await Promise.all([
    listTasksByDate(date),
    getDayExercises(date),
    listDietByDate(date),
    listPlayedInRange(date, date),
  ]);

  return {
    tasks,
    fitness,
    diet: { records: diet, totalCalories: await getTotalCalories(date) },
    games,
  };
}
