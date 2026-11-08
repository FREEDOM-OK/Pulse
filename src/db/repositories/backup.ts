import { getDriver } from '../connection';
import { ALL_TABLES, SCHEMA_VERSION } from '../schema';
import { seedExercises } from '../seed';
import { resetProfile } from './profile';
import type { SqlParam } from '../driver';

export const BACKUP_APP_ID = 'my-life-app';
export const BACKUP_VERSION = SCHEMA_VERSION;

export class BackupError extends Error {}

export interface BackupData {
  tasks: Record<string, unknown>[];
  exercises: Record<string, unknown>[];
  trainingItems: Record<string, unknown>[];
  setRecords: Record<string, unknown>[];
  wishlist: Record<string, unknown>[];
  playedGames: Record<string, unknown>[];
  events: Record<string, unknown>[];
  memos: Record<string, unknown>[];
  courses: Record<string, unknown>[];
  courseSlots: Record<string, unknown>[];
  settings: Record<string, string>;
}

export interface BackupPayload {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

/** 头像路径换机后无意义，不进备份。 */
const PROFILE_AVATAR_KEY = 'profile.avatar';

const REQUIRED_ARRAY_KEYS = [
  'tasks',
  'exercises',
  'trainingItems',
  'setRecords',
  'wishlist',
  'playedGames',
] as const;

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
  pinned: number;
  created_at: string;
}
interface ExerciseRow {
  id: number;
  name: string;
  category: string;
  is_preset: number;
  tracking_type: string;
  created_at: string;
}
interface TrainingRow {
  id: number;
  date: string;
  exercise_id: number | null;
  exercise_name: string;
  reps: number;
  weight: number;
  tracking_type: string;
  duration_minutes: number;
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
  tracking_type: string;
  duration_minutes: number | null;
  completed_at: string;
  sort_order: number;
}
interface EventRow {
  id: number;
  date: string;
  type: string;
  title: string;
  amount: number | null;
  note: string | null;
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
interface MemoRow {
  id: number;
  date: string;
  content: string;
  time: string | null;
  pinned: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
interface CourseRow {
  id: number;
  name: string;
  teacher: string | null;
  room: string | null;
  color: string | null;
  note: string | null;
  created_at: string;
}
interface CourseSlotRow {
  id: number;
  course_id: number;
  weekday: number;
  start_period: number;
  end_period: number;
  weeks: string;
  created_at: string;
}

const LEGACY_MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

/** v1/v2 备份里的饮食记录 → 今日好饭事件。 */
export function legacyDietToEvents(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const mealType = String(row.mealType ?? '');
    const calories = Number(row.calories);
    const note =
      (LEGACY_MEAL_LABELS[mealType] ?? '加餐') +
      (Number.isFinite(calories) && calories > 0 ? ` · ${calories} 千卡` : '');
    return {
      id: row.id,
      date: row.date,
      type: 'meal',
      title: row.content,
      amount: null,
      note,
      createdAt: row.createdAt,
    };
  });
}

export async function exportBackup(): Promise<BackupPayload> {
  const driver = getDriver();

  const [
    tasks,
    exercises,
    trainingItems,
    setRecords,
    wishlist,
    playedGames,
    events,
    memos,
    courses,
    courseSlots,
  ] = await Promise.all([
      driver.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY id ASC'),
      driver.getAllAsync<ExerciseRow>('SELECT * FROM exercises WHERE is_preset = 0 ORDER BY id ASC'),
      driver.getAllAsync<TrainingRow>('SELECT * FROM training_items ORDER BY id ASC'),
      driver.getAllAsync<SetRow>('SELECT * FROM set_records ORDER BY id ASC'),
      driver.getAllAsync<WishRow>('SELECT * FROM wishlist ORDER BY id ASC'),
      driver.getAllAsync<PlayedRow>('SELECT * FROM played_games ORDER BY id ASC'),
      driver.getAllAsync<EventRow>('SELECT * FROM events ORDER BY id ASC'),
      driver.getAllAsync<MemoRow>('SELECT * FROM memos ORDER BY id ASC'),
      driver.getAllAsync<CourseRow>('SELECT * FROM courses ORDER BY id ASC'),
      driver.getAllAsync<CourseSlotRow>('SELECT * FROM course_slots ORDER BY id ASC'),
    ]);

  const settingsRows = await driver.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings ORDER BY key ASC'
  );

  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
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
        pinned: row.pinned,
        createdAt: row.created_at,
      })),
      exercises: exercises.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        isPreset: row.is_preset,
        trackingType: row.tracking_type === 'duration' ? 'duration' : 'sets',
        createdAt: row.created_at,
      })),
      trainingItems: trainingItems.map((row) => ({
        id: row.id,
        date: row.date,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        reps: row.reps,
        weight: row.weight,
        trackingType: row.tracking_type === 'duration' ? 'duration' : 'sets',
        durationMinutes: row.duration_minutes,
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
        trackingType: row.tracking_type === 'duration' ? 'duration' : 'sets',
        durationMinutes: row.duration_minutes,
        completedAt: row.completed_at,
        sortOrder: row.sort_order,
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
      events: events.map((row) => ({
        id: row.id,
        date: row.date,
        type: row.type,
        title: row.title,
        amount: row.amount,
        note: row.note,
        createdAt: row.created_at,
      })),
      memos: memos.map((row) => ({
        id: row.id,
        date: row.date,
        content: row.content,
        time: row.time,
        pinned: row.pinned,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      courses: courses.map((row) => ({
        id: row.id,
        name: row.name,
        teacher: row.teacher,
        room: row.room,
        color: row.color,
        note: row.note,
        createdAt: row.created_at,
      })),
      courseSlots: courseSlots.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        weekday: row.weekday,
        startPeriod: row.start_period,
        endPeriod: row.end_period,
        weeks: row.weeks,
        createdAt: row.created_at,
      })),
      settings: Object.fromEntries(
        settingsRows
          .filter((row) => row.key !== PROFILE_AVATAR_KEY)
          .map((row) => [row.key, row.value])
      ),
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

  for (const key of REQUIRED_ARRAY_KEYS) {
    if (!Array.isArray(dataObject[key])) {
      throw new BackupError(`备份文件格式不完整：缺少 ${key}`);
    }
  }

  const legacyDietRows = Array.isArray(dataObject.dietRecords)
    ? (dataObject.dietRecords as Record<string, unknown>[])
    : null;

  let events: Record<string, unknown>[];
  if (Array.isArray(dataObject.events)) {
    events = dataObject.events as Record<string, unknown>[];
  } else if (legacyDietRows) {
    events = legacyDietToEvents(legacyDietRows);
  } else if (version >= 3) {
    throw new BackupError('备份文件格式不完整：缺少 events');
  } else {
    events = [];
  }

  const settings = dataObject.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new BackupError('备份文件格式不完整：缺少 settings');
  }

  const settingsObject = settings as Record<string, unknown>;
  const normalizedSettings: Record<string, string> = {};
  for (const [key, settingValue] of Object.entries(settingsObject)) {
    if (key === PROFILE_AVATAR_KEY) continue;
    if (typeof settingValue === 'string') normalizedSettings[key] = settingValue;
  }

  // v4 起才有备忘与课表。更早版本里的 memos 是已废弃的旧结构（无 date 字段），直接忽略。
  const isV4 = version >= 4;
  const memos = isV4 && Array.isArray(dataObject.memos)
    ? (dataObject.memos as Record<string, unknown>[])
    : [];
  const courses = isV4 && Array.isArray(dataObject.courses)
    ? (dataObject.courses as Record<string, unknown>[])
    : [];
  const courseSlots = isV4 && Array.isArray(dataObject.courseSlots)
    ? (dataObject.courseSlots as Record<string, unknown>[])
    : [];

  return {
    app: BACKUP_APP_ID,
    schemaVersion: version,
    exportedAt: String(payload.exportedAt ?? ''),
    data: {
      tasks: dataObject.tasks as Record<string, unknown>[],
      exercises: dataObject.exercises as Record<string, unknown>[],
      trainingItems: dataObject.trainingItems as Record<string, unknown>[],
      setRecords: dataObject.setRecords as Record<string, unknown>[],
      wishlist: dataObject.wishlist as Record<string, unknown>[],
      playedGames: dataObject.playedGames as Record<string, unknown>[],
      events,
      memos,
      courses,
      courseSlots,
      settings: normalizedSettings,
    },
  };
}

export function summarizeBackup(payload: BackupPayload) {
  return {
    exportedAt: payload.exportedAt,
    tasks: payload.data.tasks.length,
    trainingItems: payload.data.trainingItems.length,
    setRecords: payload.data.setRecords.length,
    wishlist: payload.data.wishlist.length,
    playedGames: payload.data.playedGames.length,
    events: payload.data.events.length,
    memos: payload.data.memos.length,
    courses: payload.data.courses.length,
    courseSlots: payload.data.courseSlots.length,
    exercises: payload.data.exercises.length,
  };
}

async function clearTables(preservePresetExercises = false): Promise<void> {
  const driver = getDriver();
  for (const table of ALL_TABLES) {
    if (table === 'exercises' && preservePresetExercises) {
      await driver.runAsync('DELETE FROM exercises WHERE is_preset = 0');
      continue;
    }
    await driver.runAsync(`DELETE FROM ${table}`);
  }

  const sequenceTables = preservePresetExercises
    ? ALL_TABLES.filter((table) => table !== 'exercises')
    : ALL_TABLES;
  try {
    await driver.runAsync(
      `DELETE FROM sqlite_sequence WHERE name IN (${sequenceTables.map(() => '?').join(', ')})`,
      sequenceTables as unknown as SqlParam[]
    );
  } catch {
    // 空库时 sqlite_sequence 可能不存在，忽略。
  }
}

function value<T>(record: Record<string, unknown>, key: string): T {
  return record[key] as T;
}

/** 整体替换：清空后用备份内容重建；ID 交给数据库重新分配，父子关系按导入后的新 ID 重建。 */
export async function importBackup(payload: BackupPayload): Promise<void> {
  const driver = getDriver();
  const data = payload.data;

  await driver.withTransactionAsync(async () => {
    await clearTables();

    const taskIds = new Map<number, number>();
    const exerciseIds = new Map<number, number>();
    const trainingIds = new Map<number, number>();
    const wishlistIds = new Map<number, number>();

    for (const row of data.tasks) {
      const result = await driver.runAsync(
        `INSERT INTO tasks
         (date, title, note, time, done, completed_at, repeat_group_id, sort_order, pinned, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          value<string>(row, 'date'),
          value<string>(row, 'title'),
          value<string | null>(row, 'note') ?? null,
          value<string | null>(row, 'time') ?? null,
          value<number>(row, 'done') ?? 0,
          value<string | null>(row, 'completedAt') ?? null,
          value<string | null>(row, 'repeatGroupId') ?? null,
          value<number>(row, 'sortOrder') ?? 0,
          value<number>(row, 'pinned') ?? 0,
          value<string>(row, 'createdAt'),
        ]
      );
      rememberId(taskIds, row, result);
    }

    for (const row of data.exercises) {
      const result = await driver.runAsync(
        `INSERT INTO exercises (name, category, is_preset, tracking_type, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          value<string>(row, 'name'),
          value<string>(row, 'category'),
          value<number>(row, 'isPreset') ?? 0,
          value<string>(row, 'trackingType') === 'duration' ? 'duration' : 'sets',
          value<string>(row, 'createdAt'),
        ]
      );
      rememberId(exerciseIds, row, result);
    }

    for (const row of data.trainingItems) {
      const result = await driver.runAsync(
        `INSERT INTO training_items
         (date, exercise_id, exercise_name, reps, weight,
          tracking_type, duration_minutes, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          value<string>(row, 'date'),
          remap(exerciseIds, row, 'exerciseId'),
          value<string>(row, 'exerciseName'),
          value<number>(row, 'reps') ?? 1,
          value<number>(row, 'weight') ?? 0,
          value<string>(row, 'trackingType') === 'duration' ? 'duration' : 'sets',
          Math.max(1, Math.round(value<number>(row, 'durationMinutes') ?? 10)),
          value<number>(row, 'sortOrder') ?? 0,
          value<string>(row, 'createdAt'),
        ]
      );
      rememberId(trainingIds, row, result);
    }

    for (const row of data.setRecords) {
      await driver.runAsync(
        `INSERT INTO set_records
         (training_item_id, date, exercise_name, set_index, reps, weight,
          tracking_type, duration_minutes, completed_at, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remap(trainingIds, row, 'trainingItemId'),
          value<string>(row, 'date'),
          value<string>(row, 'exerciseName'),
          value<number>(row, 'setIndex') ?? 1,
          value<number>(row, 'reps') ?? 1,
          value<number>(row, 'weight') ?? 0,
          value<string>(row, 'trackingType') === 'duration' ? 'duration' : 'sets',
          value<number | null>(row, 'durationMinutes') ?? null,
          value<string>(row, 'completedAt'),
          value<number>(row, 'sortOrder') ?? 0,
        ]
      );
    }

    for (const row of data.wishlist) {
      const result = await driver.runAsync(
        'INSERT INTO wishlist (name, note, status, created_at) VALUES (?, ?, ?, ?)',
        [
          value<string>(row, 'name'),
          value<string | null>(row, 'note') ?? null,
          value<string>(row, 'status') ?? 'want',
          value<string>(row, 'createdAt'),
        ]
      );
      rememberId(wishlistIds, row, result);
    }

    for (const row of data.playedGames) {
      await driver.runAsync(
        `INSERT INTO played_games
         (wishlist_id, game_name, played_date, duration_minutes, experience, rating, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          remap(wishlistIds, row, 'wishlistId'),
          value<string>(row, 'gameName'),
          value<string>(row, 'playedDate'),
          value<number>(row, 'durationMinutes') ?? 0,
          value<string | null>(row, 'experience') ?? null,
          value<number>(row, 'rating') ?? 3,
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const row of data.events) {
      await driver.runAsync(
        `INSERT INTO events (date, type, title, amount, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          value<string>(row, 'date'),
          value<string>(row, 'type') ?? 'meal',
          value<string>(row, 'title'),
          value<number | null>(row, 'amount') ?? null,
          value<string | null>(row, 'note') ?? null,
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const row of data.memos) {
      const createdAt = value<string>(row, 'createdAt');
      await driver.runAsync(
        `INSERT INTO memos (date, content, time, pinned, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          value<string>(row, 'date'),
          value<string>(row, 'content'),
          value<string | null>(row, 'time') ?? null,
          value<number>(row, 'pinned') ?? 0,
          value<number>(row, 'sortOrder') ?? 0,
          createdAt,
          value<string | null>(row, 'updatedAt') ?? createdAt,
        ]
      );
    }

    const courseIds = new Map<number, number>();
    for (const row of data.courses) {
      const result = await driver.runAsync(
        `INSERT INTO courses (name, teacher, room, color, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          value<string>(row, 'name'),
          value<string | null>(row, 'teacher') ?? null,
          value<string | null>(row, 'room') ?? null,
          value<string | null>(row, 'color') ?? null,
          value<string | null>(row, 'note') ?? null,
          value<string>(row, 'createdAt'),
        ]
      );
      rememberId(courseIds, row, result);
    }

    for (const row of data.courseSlots) {
      await driver.runAsync(
        `INSERT INTO course_slots
         (course_id, weekday, start_period, end_period, weeks, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          remap(courseIds, row, 'courseId'),
          value<number>(row, 'weekday') ?? 1,
          value<number>(row, 'startPeriod') ?? 1,
          value<number>(row, 'endPeriod') ?? 1,
          normalizeWeeksField(row.weeks),
          value<string>(row, 'createdAt'),
        ]
      );
    }

    for (const [key, settingValue] of Object.entries(data.settings)) {
      await driver.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', [key, settingValue]);
    }
  });

  await seedExercises();
  // 预置动作不随备份导出，导入后按名称把训练项目挂回动作库。
  await getDriver().runAsync(
    `UPDATE training_items
     SET exercise_id = (SELECT id FROM exercises WHERE exercises.name = training_items.exercise_name)
     WHERE exercise_id IS NULL`
  );
}

/** 备份里的 weeks 可能是数组或 JSON 字符串，统一成 JSON 字符串落库。 */
function normalizeWeeksField(raw: unknown): string {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return JSON.stringify(Array.isArray(parsed) ? parsed : []);
    } catch {
      return '[]';
    }
  }
  if (Array.isArray(raw)) return JSON.stringify(raw);
  return '[]';
}

function rememberId(
  map: Map<number, number>,
  row: Record<string, unknown>,
  result: { lastInsertRowId: number | bigint }
): void {
  const oldId = Number(row.id);
  if (Number.isFinite(oldId)) map.set(oldId, Number(result.lastInsertRowId));
}

/** 子表外键按新 ID 重映射；备份里没有该父记录时保留空值。 */
function remap(
  map: Map<number, number>,
  row: Record<string, unknown>,
  key: string
): number | null {
  const oldId = Number(row[key]);
  if (!Number.isFinite(oldId)) return null;
  return map.get(oldId) ?? null;
}

/** 清空所有业务数据与个人资料；基础必备动作永久保留。 */
export async function clearAllData(): Promise<void> {
  await getDriver().withTransactionAsync(async () => {
    await clearTables(true);
  });
  await resetProfile();
  await seedExercises();
}