import { getDriver } from '../connection';
import type { SetRecordRow, TrackingType, TrainingItemRow } from '../types';
import { nowIso } from '@/lib/date';
import { getFitnessDefaults } from './settings';

export interface AddTrainingItemInput {
  date: string;
  exerciseId: number | null;
  exerciseName: string;
  trackingType?: TrackingType;
  /** 省略时使用设置里的「默认次数」。 */
  reps?: number;
  /** 省略时使用设置里的「默认重量」。 */
  weight?: number;
  /** 按时间计的动作默认 10 分钟。 */
  durationMinutes?: number;
}

export interface TrainingItemPatch {
  reps?: number;
  weight?: number;
  durationMinutes?: number;
}

export interface TrainingSummary {
  sets: number;
  items: number;
  firstExercise: string | null;
}

/**
 * 待训练清单不再按日期划分：加进来的动作会一直留在清单里，
 * 切换到任何一天都能看到，只有「已完成」记录才按日期区分。
 */
export async function listTrainingItems(): Promise<TrainingItemRow[]> {
  return getDriver().getAllAsync<TrainingItemRow>(
    'SELECT * FROM training_items ORDER BY sort_order ASC, id ASC'
  );
}

export async function addTrainingItem(input: AddTrainingItemInput): Promise<number> {
  const driver = getDriver();
  const defaults = await getFitnessDefaults();
  const trackingType: TrackingType = input.trackingType === 'duration' ? 'duration' : 'sets';
  const reps = trackingType === 'duration' ? 1 : Math.max(1, Math.round(input.reps ?? defaults.reps));
  const weight = trackingType === 'duration' ? 0 : Math.max(0, input.weight ?? defaults.weight);
  const durationMinutes =
    trackingType === 'duration' ? Math.max(1, Math.round(input.durationMinutes ?? 10)) : 10;
  const row = await driver.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sort_order) AS maxOrder FROM training_items'
  );
  const result = await driver.runAsync(
    `INSERT INTO training_items
     (date, exercise_id, exercise_name, reps, weight, tracking_type, duration_minutes, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.date,
      input.exerciseId,
      input.exerciseName,
      reps,
      weight,
      trackingType,
      durationMinutes,
      Number(row?.maxOrder ?? 0) + 1,
      nowIso(),
    ]
  );
  return result.lastInsertRowId;
}

export async function updateTrainingItem(
  id: number,
  patch: TrainingItemPatch
): Promise<void> {
  const fields: string[] = [];
  const params: (string | number)[] = [];
  if (patch.reps !== undefined) {
    fields.push('reps = ?');
    params.push(Math.max(1, Math.round(patch.reps)));
  }
  if (patch.weight !== undefined) {
    fields.push('weight = ?');
    params.push(Math.max(0, patch.weight));
  }
  if (patch.durationMinutes !== undefined) {
    fields.push('duration_minutes = ?');
    params.push(Math.max(1, Math.round(patch.durationMinutes)));
  }
  if (fields.length === 0) return;
  params.push(id);
  await getDriver().runAsync(`UPDATE training_items SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteTrainingItem(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM training_items WHERE id = ?', [id]);
}

export async function listSetRecords(date: string): Promise<SetRecordRow[]> {
  return getDriver().getAllAsync<SetRecordRow>(
    'SELECT * FROM set_records WHERE date = ? ORDER BY sort_order ASC, id ASC',
    [date]
  );
}

export async function listSetRecordsForItem(itemId: number): Promise<SetRecordRow[]> {
  return getDriver().getAllAsync<SetRecordRow>(
    'SELECT * FROM set_records WHERE training_item_id = ? ORDER BY set_index ASC, id ASC',
    [itemId]
  );
}

export async function countSetsForItem(itemId: number): Promise<number> {
  const row = await getDriver().getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM set_records WHERE training_item_id = ?',
    [itemId]
  );
  return Number(row?.total ?? 0);
}

/**
 * 点一次「完成」：新增一条记录；按时间计的动作保存分钟数，不保存重量。
 * date 是当前查看的日期——待训练清单是共用的，完成记录只落在这一天。
 */
export async function completeSet(
  itemId: number,
  overrides?: { reps?: number; weight?: number; durationMinutes?: number },
  date?: string
): Promise<SetRecordRow> {
  const driver = getDriver();
  let created: SetRecordRow | null = null;

  await driver.withTransactionAsync(async () => {
    const item = await driver.getFirstAsync<TrainingItemRow>(
      'SELECT * FROM training_items WHERE id = ?',
      [itemId]
    );
    if (!item) throw new Error('训练项目不存在');

    const recordDate = date ?? item.date;
    const isDuration = item.tracking_type === 'duration';
    const reps = isDuration ? 1 : Math.max(1, Math.round(overrides?.reps ?? item.reps));
    const weight = isDuration ? 0 : Math.max(0, overrides?.weight ?? item.weight);
    const durationMinutes = isDuration
      ? Math.max(1, Math.round(overrides?.durationMinutes ?? item.duration_minutes ?? 10))
      : null;

    if (reps !== item.reps || weight !== item.weight || durationMinutes !== item.duration_minutes) {
      await driver.runAsync(
        `UPDATE training_items
         SET reps = ?, weight = ?, duration_minutes = ?
         WHERE id = ?`,
        [reps, weight, durationMinutes ?? item.duration_minutes, itemId]
      );
      item.reps = reps;
      item.weight = weight;
      if (durationMinutes !== null) item.duration_minutes = durationMinutes;
    }

    const countRow = await driver.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM set_records WHERE training_item_id = ? AND date = ?',
      [itemId, recordDate]
    );
    const sortRow = await driver.getFirstAsync<{ maxOrder: number | null }>(
      'SELECT MAX(sort_order) AS maxOrder FROM set_records WHERE date = ?',
      [recordDate]
    );

    const setIndex = Number(countRow?.total ?? 0) + 1;
    const sortOrder = Number(sortRow?.maxOrder ?? 0) + 1;
    const completedAt = nowIso();

    const result = await driver.runAsync(
      `INSERT INTO set_records
       (training_item_id, date, exercise_name, set_index, reps, weight,
        tracking_type, duration_minutes, completed_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        recordDate,
        item.exercise_name,
        setIndex,
        reps,
        weight,
        item.tracking_type,
        durationMinutes,
        completedAt,
        sortOrder,
      ]
    );

    created = {
      id: result.lastInsertRowId,
      training_item_id: item.id,
      date: recordDate,
      exercise_name: item.exercise_name,
      set_index: setIndex,
      reps,
      weight,
      tracking_type: item.tracking_type,
      duration_minutes: durationMinutes,
      completed_at: completedAt,
      sort_order: sortOrder,
    };
  });

  if (!created) throw new Error('完成记录创建失败');
  return created;
}

/** 撤销一组：删除记录，并把同一动作剩余记录重新编号为 1..n。 */
export async function undoSet(recordId: number): Promise<void> {
  const driver = getDriver();

  await driver.withTransactionAsync(async () => {
    const record = await driver.getFirstAsync<SetRecordRow>(
      'SELECT * FROM set_records WHERE id = ?',
      [recordId]
    );
    if (!record) return;

    await driver.runAsync('DELETE FROM set_records WHERE id = ?', [recordId]);

    if (record.training_item_id === null) return;

    const remaining = await driver.getAllAsync<{ id: number }>(
      'SELECT id FROM set_records WHERE training_item_id = ? AND date = ? ORDER BY set_index ASC, id ASC',
      [record.training_item_id, record.date]
    );
    for (let index = 0; index < remaining.length; index += 1) {
      await driver.runAsync('UPDATE set_records SET set_index = ? WHERE id = ?', [
        index + 1,
        remaining[index].id,
      ]);
    }
  });
}

export async function deleteSetRecord(recordId: number): Promise<void> {
  await undoSet(recordId);
}

export async function getTrainingSummary(date: string): Promise<TrainingSummary> {
  const driver = getDriver();
  const setsRow = await driver.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM set_records WHERE date = ?',
    [date]
  );
  const itemsRow = await driver.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM training_items WHERE date = ?',
    [date]
  );
  const first = await driver.getFirstAsync<SetRecordRow>(
    'SELECT * FROM set_records WHERE date = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
    [date]
  );
  return {
    sets: Number(setsRow?.total ?? 0),
    items: Number(itemsRow?.total ?? 0),
    firstExercise: first?.exercise_name ?? null,
  };
}

/** 日历回顾用：某天的动作和完成记录数汇总。 */
export async function getDayExercises(
  date: string
): Promise<{ exerciseName: string; sets: number }[]> {
  const driver = getDriver();
  const rows = await driver.getAllAsync<{ exercise_name: string; sets: number }>(
    `SELECT exercise_name, COUNT(*) AS sets
     FROM set_records WHERE date = ?
     GROUP BY exercise_name
     ORDER BY MIN(sort_order) ASC`,
    [date]
  );
  return rows.map((row) => ({ exerciseName: row.exercise_name, sets: Number(row.sets) }));
}
