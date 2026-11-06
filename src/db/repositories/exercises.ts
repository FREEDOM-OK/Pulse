import { getDriver } from '../connection';
import type { ExerciseRow, TrackingType } from '../types';
import { ALL_EXERCISE_CATEGORIES, CUSTOM_EXERCISE_CATEGORY } from '../types';
import { nowIso } from '@/lib/date';

export interface Exercise {
  id: number;
  name: string;
  category: string;
  isPreset: boolean;
  trackingType: TrackingType;
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    isPreset: row.is_preset === 1,
    trackingType: row.tracking_type === 'duration' ? 'duration' : 'sets',
  };
}

/** 按部位顺序 + 名称排序返回全部动作，自定义类固定在最后。 */
export async function listExercises(): Promise<Exercise[]> {
  const rows = await getDriver().getAllAsync<ExerciseRow>('SELECT * FROM exercises');
  const order = new Map<string, number>(ALL_EXERCISE_CATEGORIES.map((category, index) => [category, index]));
  return rows
    .map(mapExercise)
    .sort((a, b) => {
      const byCategory = (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99);
      if (byCategory !== 0) return byCategory;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
}

export async function listExercisesByCategory(): Promise<Record<string, Exercise[]>> {
  const all = await listExercises();
  const grouped: Record<string, Exercise[]> = {};
  for (const category of ALL_EXERCISE_CATEGORIES) {
    grouped[category] = [];
  }
  for (const exercise of all) {
    const bucket = grouped[exercise.category] ?? (grouped[exercise.category] = []);
    bucket.push(exercise);
  }
  return grouped;
}

/**
 * 兼容旧调用的创建入口。
 * 新界面应使用 createCustomExercise，让自定义动作统一进入“自定义类”。
 */
export async function createExercise(
  name: string,
  category: string = CUSTOM_EXERCISE_CATEGORY,
  trackingType: TrackingType = 'sets'
): Promise<number> {
  const result = await getDriver().runAsync(
    `INSERT INTO exercises (name, category, is_preset, tracking_type, created_at)
     VALUES (?, ?, 0, ?, ?)`,
    [name.trim(), category, trackingType, nowIso()]
  );
  return result.lastInsertRowId;
}

export async function createCustomExercise(
  name: string,
  trackingType: TrackingType
): Promise<number> {
  return createExercise(name, CUSTOM_EXERCISE_CATEGORY, trackingType);
}

/** 基础动作不可删除；即使直接调用仓储，也只允许删除自定义动作。 */
export async function deleteExercise(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM exercises WHERE id = ? AND is_preset = 0', [id]);
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
