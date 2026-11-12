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

export const MIGRATION_V2 = `
ALTER TABLE exercises ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'sets';
ALTER TABLE training_items ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'sets';
ALTER TABLE training_items ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 10;
ALTER TABLE set_records ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'sets';
ALTER TABLE set_records ADD COLUMN duration_minutes INTEGER;
`;

/**
 * v1.1：新增事件表；饮食记录整体转成「今日好饭」事件后删表；
 * 快速备忘功能废弃，直接删表。
 */
export const MIGRATION_V3 = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

INSERT INTO events (date, type, title, amount, note, created_at)
  SELECT date,
         'meal',
         content,
         NULL,
         CASE meal_type
           WHEN 'breakfast' THEN '早餐'
           WHEN 'lunch' THEN '午餐'
           WHEN 'dinner' THEN '晚餐'
           ELSE '加餐'
         END
         || CASE
              WHEN calories IS NULL OR calories <= 0 THEN ''
              ELSE ' · ' || calories || ' 千卡'
            END,
         created_at
    FROM diet_records;

DROP TABLE IF EXISTS diet_records;
DROP TABLE IF EXISTS memos;
`;

/**
 * v1.2：任务加置顶；重建备忘表（v3 删过，这里按新结构建）；
 * 新增课表两张表（课程 + 上课时段）。
 */
export const MIGRATION_V4 = `
ALTER TABLE tasks ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  time TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memos_date ON memos(date);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teacher TEXT,
  room TEXT,
  color TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  weekday INTEGER NOT NULL,
  start_period INTEGER NOT NULL,
  end_period INTEGER NOT NULL,
  weeks TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_slots_course ON course_slots(course_id);
CREATE INDEX IF NOT EXISTS idx_course_slots_weekday ON course_slots(weekday);
`;

/**
 * v1.2.1：按周跳过课程（「仅本周删除」）。
 */
export const MIGRATION_V5 = `
CREATE TABLE IF NOT EXISTS course_exceptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_exceptions_course_week ON course_exceptions(course_id, week);
`;

/**
 * v1.2.2：课程块底色样式（纯色 / 网格 / 斑马纹）。
 */
export const MIGRATION_V6 = `
ALTER TABLE courses ADD COLUMN background TEXT NOT NULL DEFAULT 'plain';
`;

/**
 * v1.3：课表按 Schedule 项目重写——多课表 + 课程 + 时段；
 * 删除 v1.2 的旧课程三表（数据不保留）。
 */
export const MIGRATION_V7 = `
DROP TABLE IF EXISTS course_exceptions;
DROP TABLE IF EXISTS course_slots;
DROP TABLE IF EXISTS courses;

CREATE TABLE IF NOT EXISTS schedules (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  TEXT NOT NULL,
  total_weeks INTEGER NOT NULL DEFAULT 20,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sched_courses (
  id          TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,
  credits     TEXT DEFAULT '选填',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sched_sessions (
  id           TEXT PRIMARY KEY,
  course_id    TEXT NOT NULL,
  teacher      TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL DEFAULT '',
  day_of_week  INTEGER NOT NULL,
  start_period INTEGER NOT NULL,
  end_period   INTEGER NOT NULL,
  weeks        TEXT NOT NULL,
  remark       TEXT DEFAULT '',
  custom_time  TEXT DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sched_sessions_conflict
  ON sched_sessions(course_id, day_of_week, start_period);
CREATE INDEX IF NOT EXISTS idx_sched_courses_schedule ON sched_courses(schedule_id);
`;

/**
 * v8：放宽时段唯一约束——同一课程同一天允许两段相同起始节的时段
 * （如「1-2 节实验」与「1-4 节理论」并存），改为普通查询索引。
 */
export const MIGRATION_V8 = `
DROP INDEX IF EXISTS idx_sched_sessions_conflict;
CREATE INDEX IF NOT EXISTS idx_sched_sessions_course
  ON sched_sessions(course_id, day_of_week);
`;

/**
 * v9：搜索历史。只存关键词与最近搜索时间，不存业务结果。
 * query 作为主键，重复搜索时更新时间和命中次数。
 */
export const MIGRATION_V9 = `
CREATE TABLE IF NOT EXISTS search_history (
  query TEXT PRIMARY KEY,
  searched_at TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_search_history_time ON search_history(searched_at);
`;

export const MIGRATIONS: string[] = [
  MIGRATION_V1,
  MIGRATION_V2,
  MIGRATION_V3,
  MIGRATION_V4,
  MIGRATION_V5,
  MIGRATION_V6,
  MIGRATION_V7,
  MIGRATION_V8,
  MIGRATION_V9,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** 所有业务表（清空数据时按此顺序删除）。 */
export const ALL_TABLES = [
  'search_history',
  'set_records',
  'training_items',
  'played_games',
  'wishlist',
  'tasks',
  'memos',
  'sched_sessions',
  'sched_courses',
  'schedules',
  'events',
  'exercises',
  'settings',
] as const;
