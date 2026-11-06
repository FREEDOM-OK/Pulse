import { getDriver } from './connection';
import { PRESET_EXERCISES } from './seed-data';

interface CountRow {
  total: number;
}

/** 首次启动写入预置动作；已有预置动作时跳过，可重复调用。 */
export async function seedExercises(): Promise<number> {
  const driver = getDriver();
  const row = await driver.getFirstAsync<CountRow>(
    'SELECT COUNT(*) AS total FROM exercises WHERE is_preset = 1'
  );
  if (Number(row?.total ?? 0) > 0) {
    return 0;
  }

  const now = new Date().toISOString();
  await driver.withTransactionAsync(async () => {
    for (const exercise of PRESET_EXERCISES) {
      await driver.runAsync(
        'INSERT INTO exercises (name, category, is_preset, created_at) VALUES (?, ?, 1, ?)',
        [exercise.name, exercise.category, now]
      );
    }
  });

  return PRESET_EXERCISES.length;
}
