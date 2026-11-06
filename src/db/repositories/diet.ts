import type { SqlParam } from '../driver';
import { getDriver } from '../connection';
import type { DietRecordRow, MealType } from '../types';
import { nowIso } from '@/lib/date';

export interface AddDietInput {
  date: string;
  mealType: MealType;
  content: string;
  calories?: number | null;
}

export async function listDietByDate(date: string): Promise<DietRecordRow[]> {
  return getDriver().getAllAsync<DietRecordRow>(
    'SELECT * FROM diet_records WHERE date = ? ORDER BY created_at ASC, id ASC',
    [date]
  );
}

export async function addDietRecord(input: AddDietInput): Promise<number> {
  const result = await getDriver().runAsync(
    'INSERT INTO diet_records (date, meal_type, content, calories, created_at) VALUES (?, ?, ?, ?, ?)',
    [
      input.date,
      input.mealType,
      input.content.trim(),
      input.calories === undefined ? null : input.calories,
      nowIso(),
    ]
  );
  return result.lastInsertRowId;
}

export async function updateDietRecord(
  id: number,
  patch: { mealType?: MealType; content?: string; calories?: number | null }
): Promise<void> {
  const fields: string[] = [];
  const params: SqlParam[] = [];

  if (patch.mealType !== undefined) {
    fields.push('meal_type = ?');
    params.push(patch.mealType);
  }
  if (patch.content !== undefined) {
    fields.push('content = ?');
    params.push(patch.content.trim());
  }
  if (patch.calories !== undefined) {
    fields.push('calories = ?');
    params.push(patch.calories);
  }
  if (fields.length === 0) return;

  params.push(id);
  await getDriver().runAsync(`UPDATE diet_records SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteDietRecord(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM diet_records WHERE id = ?', [id]);
}

export async function getTotalCalories(date: string): Promise<number> {
  const row = await getDriver().getFirstAsync<{ total: number | null }>(
    'SELECT COALESCE(SUM(calories), 0) AS total FROM diet_records WHERE date = ?',
    [date]
  );
  return Number(row?.total ?? 0);
}

export async function getDietSummary(
  date: string
): Promise<{ totalCalories: number; records: number }> {
  const row = await getDriver().getFirstAsync<{ total: number | null; records: number }>(
    'SELECT COALESCE(SUM(calories), 0) AS total, COUNT(*) AS records FROM diet_records WHERE date = ?',
    [date]
  );
  return { totalCalories: Number(row?.total ?? 0), records: Number(row?.records ?? 0) };
}

export async function listDietInRange(from: string, to: string): Promise<DietRecordRow[]> {
  return getDriver().getAllAsync<DietRecordRow>(
    'SELECT * FROM diet_records WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC',
    [from, to]
  );
}
