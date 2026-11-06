import { getDriver } from '../connection';
import { ALL_TABLES, SCHEMA_VERSION } from '../schema';
import type { SqlParam } from '../driver';

export const BACKUP_APP_ID = 'my-life-app';
export const BACKUP_VERSION = SCHEMA_VERSION;

export class BackupError extends Error {}

export interface BackupData {
  memos: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  exercises: Record<string, unknown>[];
  trainingItems: Record<string, unknown>[];
  setRecords: Record<string, unknown>[];
  dietRecords: Record<string, unknown>[];
  wishlist: Record<string, unknown>[];
  playedGames: Record<string, unknown>[];
  settings: Record<string, string>;
}

export interface BackupPayload {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

const ARRAY_KEYS = [
  'memos',
  'tasks',
  'exercises',
  'trainingItems',
  'setRecords',
  'dietRecords',
  'wishlist',
  'playedGames',
] as const;

interface MemoRow {
  id: number;
  content: string;
  tags: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}
interface TaskRow {
  id: number;
  date: string;
  title: string;
  note: string | null;
  time: string | null;
  done: number;
  completed_at: string | null;
  repeat_group_id: string | null;
  sort_order: number;
  created_at: string;
}
interface ExerciseRow {
  id: number;
  name: string;
  category: string;
  is_preset: number;
  created_at: string;
}
interface TrainingRow {
  id: number;
  date: string;
  exercise_id: number | null;
  exercise_name: string;
  reps: number;
  weight: number;
  sort_order: number;
  created_at: string;
}
interface SetRow {
  id: number;
  training_item_id: number | null;
  date: string;
  exercise_name: string;
  set_index: number;
  reps: number;
  weight: number;
  completed_at: string;
  sort_order: number;
}
interface DietRow {
  id: number;
  date: string;
  meal_type: string;
  content: string;
  calories: number | null;
  created_at: string;
}
interface WishRow {
  id: number;
  name: string;
  note: string | null;
  status: string;
  created_at: string;
}
interface PlayedRow {
  id: number;
  wishlist_id: number | null;
  game_name: string;
  played_date: string;
  duration_minutes: number;
  experience: string | null;
  rating: number;
  created_at: string;
}

export async function exportBackup(): Promise<BackupPayload> {
  const driver = getDriver();

  const [memos, tasks, exercises, trainingItems, setRecords, dietRecords, wishlist, playedGames] =
    await Promise.all([
      driver.getAllAsync<MemoRow>('SELECT * FROM memos ORDER BY id ASC'),
      driver.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY id ASC'),
      driver.getAllAsync<ExerciseRow>('SELECT * FROM exercises ORDER BY id ASC'),
      driver.getAllAsync<TrainingRow>('SELECT * FROM training_items ORDER BY id ASC'),
      driver.getAllAsync<SetRow>('SELECT * FROM set_records ORDER BY id ASC'),
      driver.getAllAsync<DietRow>('SELECT * FROM diet_records ORDER BY id ASC'),
      driver.getAllAsync<WishRow>('SELECT * FROM wishlist ORDER BY id ASC'),
      driver.getAllAsync<PlayedRow>('SELECT * FROM played_games ORDER BY id ASC'),
    ]);

  const settingsRows = await driver.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings ORDER BY key ASC'
  );

  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      memos: memos.map((row) => ({
        id: row.id,
        content: row.content,
        tags: row.tags,
        pinned: row.pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      tasks: tasks.map((row) => ({
        id: row.id,
        date: row.date,
        title: row.title,
        note: row.note,
        time: row.time,
        done: row.done,
        completedAt: row.completed_at,
        repeatGroupId: row.repeat_group_id,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      })),
      exercises: exercises.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        isPreset: row.is_preset,
        createdAt: row.created_at,
      })),
      trainingItems: trainingItems.map((row) => ({
        id: row.id,
        date: row.date,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        reps: row.reps,
        weight: row.weight,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      })),
      setRecords: setRecords.map((row) => ({
        id: row.id,
        trainingItemId: row.training_item_id,
        date: row.date,
        exerciseName: row.exercise_name,
        setIndex: row.set_index,
        reps: row.reps,
        weight: row.weight,
        completedAt: row.completed_at,
        sortOrder: row.sort_order,
      })),
      dietRecords: dietRecords.map((row) => ({
        id: row.id,
        date: row.date,
        mealType: row.meal_type,
        content: row.content,
        calories: row.calories,
        createdAt: row.created_at,
      })),
      wishlist: wishlist.map((row) => ({
        id: row.id,
        name: row.name,
        note: row.note,
        status: row.status,
        createdAt: row.created_at,
      })),
      playedGames: playedGames.map((row) => ({
        id: row.id,
        wishlistId: row.wishlist_id,
        gameName: row.game_name,
        playedDate: row.played_date,
        durationMinutes: row.duration_minutes,
        experience: row.experience,
        rating: row.rating,
        createdAt: row.created_at,
      })),
      settings: Object.fromEntries(settingsRows.map((row) => [row.key, row.value])),
    },
  };
}

/** 校验备份结构；不合法时抛出带中文说明的 BackupError。 */
export function parseBackupPayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BackupError('不是有效的备份文件');
  }
  const payload = raw as Record<string, unknown>;

  if (payload.app !== BACKUP_APP_ID) {
    throw new BackupError('这不是本 App 的备份文件');
  }
  const version = Number(payload.schemaVersion);
  if (!Number.isFinite(version) || version < 1) {
    throw new BackupError('备份文件缺少版本信息');
  }
  if (version > BACKUP_VERSION) {
    throw new BackupError('备份来自更新版本的 App，请先更新 App 再导入');
  }

  const data = payload.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BackupError('备份文件里没有数据');
  }
  const dataObject = data as Record<string, unknown>;

  for (const key of ARRAY_KEYS) {
    if (!Array.isArray(dataObject[key])) {
      throw new BackupError(`备份文件格式不完整：缺少 ${key}`);
    }
  }

  const settings = dataObject.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new BackupError('备份文件格式不完整：缺少 settings');
  }

  return {
    app: BACKUP_APP_ID,
    schemaVersion: version,
    exportedAt: String(payload.exportedAt ?? ''),
    data: dataObject as unknown as BackupData,
  };
}

export function summarizeBackup(payload: BackupPayload) {
  return {
    exportedAt: payload.exportedAt,
    tasks: payload.data.tasks.length,
    memos: payload.data.memos.length,
    trainingItems: payload.data.trainingItems.length,
    setRecords: payload.data.setRecords.length,
    dietRecords: payload.data.dietRecords.length,
    wishlist: payload.data.wishlist.length,
    playedGames: payload.data.playedGames.length,
    exercises: payload.data.exercises.length,
  };
}

async function clearTables(): Promise<void> {
  const driver = getDriver();
  for (const table of ALL_TABLES) {
    await driver.runAsync(`DELETE FROM ${table}`);
  }
  try {
    await driver.runAsync(
      `DELETE FROM sqlite_sequence WHERE name IN (${ALL_TABLES.map(() => '?').join(', ')})`,
      ALL_TABLES as unknown as SqlParam[]
    );
  } catch {
    // 空库时 sqlite_sequence 可能不存在，忽略。
  }
}

function value<T>(record: Record<string, unknown>, key: string): T {
  return record[key] as T;
}

/** 整体替换：清空后用备份内容重建。 */
export async function importBackup(payload: BackupPayload): Promise<void> {
  const driver = getDriver();
  const data = payload.data;

  await driver.withTransactionAsync(async () => {
    await clearTables();

    for (const row of data.memos) {
      await driver.runAsync(
        'INSERT INTO memos (id, content, tags, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          value<number>(row, 'id'),
          value<string>(row, 'content'),
          value<string>(row, 'tags') ?? '[]',
          value<number>(row, 'pinned') ?? 0,
          value<string>(row, 'createdAt'),
          value<string>(row, 'updatedAt'),
        ]
      );
    }

    for (const row of data.tasks) {
      await driver.runAsync(
        `INSERT INTO tasks
         (id, date, title, note, time, done, completed_at, repeat_group_id, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          value<number>(row, 'id'),
          value<string>(row, 'date'),
          value<string>(row, 'title'),
          value<string | null>(row, 'note') ?? null,
          value<string | null>(row, 'time') ?? null,
          value<number>(row, 'done') ?? 0,
          value<string | null>(row, 'completedAt') ?? null,
          value<string | null>(row, 'repeatGroupId') ?? null,
          value<number>(row, 'sortOrder') ?? 0,
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const row of data.exercises) {
      await driver.runAsync(
        'INSERT INTO exercises (id, name, category, is_preset, created_at) VALUES (?, ?, ?, ?, ?)',
        [
          value<number>(row, 'id'),
          value<string>(row, 'name'),
          value<string>(row, 'category'),
          value<number>(row, 'isPreset') ?? 0,
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const row of data.trainingItems) {
      await driver.runAsync(
        `INSERT INTO training_items
         (id, date, exercise_id, exercise_name, reps, weight, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          value<number>(row, 'id'),
          value<string>(row, 'date'),
          value<number | null>(row, 'exerciseId') ?? null,
          value<string>(row, 'exerciseName'),
          value<number>(row, 'reps') ?? 1,
          value<number>(row, 'weight') ?? 0,
          value<number>(row, 'sortOrder') ?? 0,
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const row of data.setRecords) {
      await driver.runAsync(
        `INSERT INTO set_records
         (id, training_item_id, date, exercise_name, set_index, reps, weight, completed_at, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          value<number>(row, 'id'),
          value<number | null>(row, 'trainingItemId') ?? null,
          value<string>(row, 'date'),
          value<string>(row, 'exerciseName'),
          value<number>(row, 'setIndex') ?? 1,
          value<number>(row, 'reps') ?? 1,
          value<number>(row, 'weight') ?? 0,
          value<string>(row, 'completedAt'),
          value<number>(row, 'sortOrder') ?? 0,
        ]
      );
    }

    for (const row of data.dietRecords) {
      await driver.runAsync(
        `INSERT INTO diet_records (id, date, meal_type, content, calories, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          value<number>(row, 'id'),
          value<string>(row, 'date'),
          value<string>(row, 'mealType'),
          value<string>(row, 'content'),
          value<number | null>(row, 'calories') ?? null,
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const row of data.wishlist) {
      await driver.runAsync(
        'INSERT INTO wishlist (id, name, note, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [
          value<number>(row, 'id'),
          value<string>(row, 'name'),
          value<string | null>(row, 'note') ?? null,
          value<string>(row, 'status') ?? 'want',
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const row of data.playedGames) {
      await driver.runAsync(
        `INSERT INTO played_games
         (id, wishlist_id, game_name, played_date, duration_minutes, experience, rating, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          value<number>(row, 'id'),
          value<number | null>(row, 'wishlistId') ?? null,
          value<string>(row, 'gameName'),
          value<string>(row, 'playedDate'),
          value<number>(row, 'durationMinutes') ?? 0,
          value<string | null>(row, 'experience') ?? null,
          value<number>(row, 'rating') ?? 3,
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const [key, settingValue] of Object.entries(data.settings)) {
      await driver.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', [key, settingValue]);
    }
  });
}

/** 清空所有业务数据（设置也清空）。 */
export async function clearAllData(): Promise<void> {
  const driver = getDriver();
  await driver.withTransactionAsync(async () => {
    await clearTables();
  });
}
