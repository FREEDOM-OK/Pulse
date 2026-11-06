import { getDriver } from './connection';
import { PRESET_EXERCISES } from './seed-data';

interface ExistingExerciseRow {
  id: number;
  name: string;
  category: string;
  tracking_type: string;
}

/**
 * 同步基础必备动作。
 * 逐项补齐并更新计算方式，退役旧版基础动作；可重复调用且不会重复插入。
 */
export async function seedExercises(): Promise<number> {
  const driver = getDriver();
  const existing = await driver.getAllAsync<ExistingExerciseRow>(
    'SELECT id, name, category, tracking_type FROM exercises WHERE is_preset = 1'
  );
  const existingByName = new Map(existing.map((row) => [row.name, row]));
  const now = new Date().toISOString();
  let inserted = 0;

  await driver.withTransactionAsync(async () => {
    for (const exercise of PRESET_EXERCISES) {
      const row = existingByName.get(exercise.name);
      if (row) {
        await driver.runAsync(
          `UPDATE exercises
           SET category = ?, tracking_type = ?, is_preset = 1
           WHERE id = ?`,
          [exercise.category, exercise.trackingType, row.id]
        );
        continue;
      }

      await driver.runAsync(
        `INSERT INTO exercises (name, category, is_preset, tracking_type, created_at)
         VALUES (?, ?, 1, ?, ?)`,
        [exercise.name, exercise.category, exercise.trackingType, now]
      );
      inserted += 1;
    }

    const names = PRESET_EXERCISES.map((exercise) => exercise.name);
    await driver.runAsync(
      `DELETE FROM exercises
       WHERE is_preset = 1 AND name NOT IN (${names.map(() => '?').join(', ')})`,
      names
    );
  });

  return inserted;
}
