/**
 * 数据库表结构。
 *
 * 每个迁移步骤对应一个字符串，按顺序执行，执行后用 PRAGMA user_version 记录进度。
 * 第一版所有表都在 v1 里建立。
 */

export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  time TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  repeat_group_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  exercise_id INTEGER,
  exercise_name TEXT NOT NULL,
  reps INTEGER NOT NULL DEFAULT 1,
  weight REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS set_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_item_id INTEGER,
  date TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL NOT NULL,
  completed_at TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS diet_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  content TEXT NOT NULL,
  calories INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'want',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS played_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wishlist_id INTEGER,
  game_name TEXT NOT NULL,
  played_date TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  experience TEXT,
  rating INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_training_items_date ON training_items(date);
CREATE INDEX IF NOT EXISTS idx_set_records_date ON set_records(date);
CREATE INDEX IF NOT EXISTS idx_set_records_item ON set_records(training_item_id);
CREATE INDEX IF NOT EXISTS idx_diet_records_date ON diet_records(date);
CREATE INDEX IF NOT EXISTS idx_played_games_date ON played_games(played_date);
CREATE INDEX IF NOT EXISTS idx_memos_pinned ON memos(pinned, updated_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_status ON wishlist(status);
`;

export const MIGRATIONS: string[] = [MIGRATION_V1];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** 所有业务表（清空数据时按此顺序删除）。 */
export const ALL_TABLES = [
  'set_records',
  'training_items',
  'diet_records',
  'played_games',
  'wishlist',
  'tasks',
  'memos',
  'exercises',
  'settings',
] as const;
