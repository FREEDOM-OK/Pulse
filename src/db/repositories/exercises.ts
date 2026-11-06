import { getDriver } from '../connection';
import type { ExerciseRow } from '../types';
import { EXERCISE_CATEGORIES } from '../types';
import { nowIso } from '@/lib/date';

export interface Exercise {
  id: number;
  name: string;
  category: string;
  isPreset: boolean;
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    isPreset: row.is_preset === 1,
  };
}

/** 按部位顺序 + 名称排序返回全部动作。 */
export async function listExercises(): Promise<Exercise[]> {
  const rows = await getDriver().getAllAsync<ExerciseRow>('SELECT * FROM exercises');
  const order = new Map(EXERCISE_CATEGORIES.map((category, index) => [category, index]));
  return rows
    .map(mapExercise)
    .sort((a, b) => {
      const byCategory = (order.get(a.category as never) ?? 99) - (order.get(b.category as never) ?? 99);
      if (byCategory !== 0) return byCategory;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
}

export async function listExercisesByCategory(): Promise<Record<string, Exercise[]>> {
  const all = await listExercises();
  const grouped: Record<string, Exercise[]> = {};
  for (const category of EXERCISE_CATEGORIES) {
    grouped[category] = [];
  }
  for (const exercise of all) {
    const bucket = grouped[exercise.category] ?? (grouped[exercise.category] = []);
    bucket.push(exercise);
  }
  return grouped;
}

export async function createExercise(name: string, category: string): Promise<number> {
  const result = await getDriver().runAsync(
    'INSERT INTO exercises (name, category, is_preset, created_at) VALUES (?, ?, 0, ?)',
    [name.trim(), category, nowIso()]
  );
  return result.lastInsertRowId;
}

export async function deleteExercise(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}

export async function countExercises(): Promise<number> {
  const row = await getDriver().getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM exercises'
  );
  return Number(row?.total ?? 0);
}

export async function findExerciseByName(name: string): Promise<Exercise | null> {
  const row = await getDriver().getFirstAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE name = ? LIMIT 1',
    [name.trim()]
  );
  return row ? mapExercise(row) : null;
}
