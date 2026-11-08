/** 数据库行类型与领域常量。 */

export type EventType = 'expense' | 'shopping' | 'meal';

export const EVENT_TYPES: EventType[] = ['expense', 'shopping', 'meal'];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  expense: '重大消费',
  shopping: '重大购物',
  meal: '今日好饭',
};

/** 三种事件表单里标题字段的名字。 */
export const EVENT_TITLE_LABELS: Record<EventType, string> = {
  expense: '事件名称',
  shopping: '物品',
  meal: '吃了什么',
};

export interface EventRow {
  id: number;
  date: string;
  type: EventType;
  title: string;
  amount: number | null;
  note: string | null;
  created_at: string;
}

export type ProfileGender = 'male' | 'female' | 'secret';

export const PROFILE_GENDERS: ProfileGender[] = ['male', 'female', 'secret'];

export const PROFILE_GENDER_LABELS: Record<ProfileGender, string> = {
  male: '男',
  female: '女',
  secret: '保密',
};

export interface ProfileRow {
  name: string;
  gender: ProfileGender;
  /** YYYY-MM-DD，可空。 */
  birthday: string | null;
  /** 头像在 App 私有目录里的绝对路径，可空。 */
  avatarUri: string | null;
}

export const EXERCISE_CATEGORIES = ['胸', '背', '腿', '肩', '手臂', '核心', '有氧'] as const;

export type PresetExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const CUSTOM_EXERCISE_CATEGORY = '自定义类' as const;

export type ExerciseCategory = PresetExerciseCategory | typeof CUSTOM_EXERCISE_CATEGORY;

export const ALL_EXERCISE_CATEGORIES: ExerciseCategory[] = [
  '胸',
  '背',
  '腿',
  '肩',
  '手臂',
  '核心',
  '有氧',
  CUSTOM_EXERCISE_CATEGORY,
];

export type TrackingType = 'sets' | 'duration';

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  sets: '按组计',
  duration: '按时间计',
};

export type WishStatus = 'want' | 'played';

export interface TaskRow {
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

export interface MemoRow {
  id: number;
  date: string;
  content: string;
  time: string | null;
  pinned: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseRow {
  id: number;
  name: string;
  teacher: string | null;
  room: string | null;
  color: string | null;
  note: string | null;
  created_at: string;
}

export interface CourseSlotRow {
  id: number;
  course_id: number;
  /** 1=周一 … 7=周日。 */
  weekday: number;
  start_period: number;
  end_period: number;
  /** JSON 数组字符串，如 "[1,3,5]"；空数组 "[]" 表示每周。 */
  weeks: string;
  created_at: string;
}

/** 今日列表排序模式。 */
export type SortMode = 'memo-first' | 'task-first' | 'mixed';

export const SORT_MODES: SortMode[] = ['memo-first', 'task-first', 'mixed'];

export const SORT_MODE_LABELS: Record<SortMode, string> = {
  'memo-first': '备忘在前',
  'task-first': '计划在前',
  mixed: '按时间混排',
};

/** 首页万事卡。 */
export type HomeCardId = 'fitness' | 'games' | 'calendar' | 'timetable';

export const HOME_CARD_IDS: HomeCardId[] = ['fitness', 'games', 'calendar', 'timetable'];

export const DEFAULT_HOME_CARDS: HomeCardId[] = ['fitness', 'games', 'calendar', 'timetable'];

/** 首页卡片默认开关：课表默认关闭。 */
export const DEFAULT_ENABLED_CARDS: HomeCardId[] = ['fitness', 'games', 'calendar'];



export interface ExerciseRow {
  id: number;
  name: string;
  category: string;
  is_preset: number;
  tracking_type: TrackingType;
  created_at: string;
}

export interface TrainingItemRow {
  id: number;
  date: string;
  exercise_id: number | null;
  exercise_name: string;
  reps: number;
  weight: number;
  tracking_type: TrackingType;
  duration_minutes: number;
  sort_order: number;
  created_at: string;
}

export interface SetRecordRow {
  id: number;
  training_item_id: number | null;
  date: string;
  exercise_name: string;
  set_index: number;
  reps: number;
  weight: number;
  tracking_type: TrackingType;
  duration_minutes: number | null;
  completed_at: string;
  sort_order: number;
}



export interface WishlistRow {
  id: number;
  name: string;
  note: string | null;
  status: WishStatus;
  created_at: string;
}

export interface PlayedGameRow {
  id: number;
  wishlist_id: number | null;
  game_name: string;
  played_date: string;
  duration_minutes: number;
  experience: string | null;
  rating: number;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
}
