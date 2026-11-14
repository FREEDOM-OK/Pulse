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

/** 日历回顾里事件分类徽章的视觉配置。 */
export interface EventBadgeStyle {
  /** 徽章上的完整文案。 */
  label: string;
  /** 卡片头部汇总时用的短文案。 */
  shortLabel: string;
  background: string;
  text: string;
}

export const EVENT_BADGE_STYLES: Record<EventType, EventBadgeStyle> = {
  expense: {
    label: '记消费',
    shortLabel: '消费',
    background: 'rgba(225, 82, 65, 0.14)',
    text: '#E15241',
  },
  shopping: {
    label: '记购物',
    shortLabel: '购物',
    background: 'rgba(245, 158, 11, 0.14)',
    text: '#D97706',
  },
  meal: {
    label: '记好饭',
    shortLabel: '好饭',
    background: 'rgba(16, 185, 129, 0.14)',
    text: '#059669',
  },
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
  /** 课程块底色样式，v6 起有值。 */
  background: string;
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

/** 一节课的起止时间（HH:MM）。 */
export interface PeriodTime {
  start: string;
  end: string;
}

/** 某门课在某一周被跳过（仅本周删除）。 */
export interface CourseExceptionRow {
  id: number;
  course_id: number;
  /** 学期第几周，1 起。 */
  week: number;
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

/** 首页 Dash 卡片。 */
export type HomeCardId = 'fitness' | 'games' | 'calendar' | 'timetable';

export const HOME_CARD_IDS: HomeCardId[] = ['fitness', 'games', 'calendar', 'timetable'];

export const DEFAULT_HOME_CARDS: HomeCardId[] = ['fitness', 'games', 'calendar', 'timetable'];

/** 首页卡片默认开关：课表默认关闭。 */
export const DEFAULT_ENABLED_CARDS: HomeCardId[] = ['fitness', 'games', 'calendar'];

/** 底栏第三个标签放哪个模块（PRD_module 第 8 节：健身 / 课表 / 日历）。 */
export type MiddleTab = 'fitness' | 'timetable' | 'calendar';

export const MIDDLE_TABS: MiddleTab[] = ['fitness', 'timetable', 'calendar'];

export const MIDDLE_TAB_LABELS: Record<MiddleTab, string> = {
  fitness: '健身',
  timetable: '课表',
  calendar: '日历',
};

/** Dash 卡片的展示模式。 */
export type DashMode = 'carousel' | 'stack';

export const DASH_MODES: DashMode[] = ['carousel', 'stack'];

export const DASH_MODE_LABELS: Record<DashMode, string> = {
  carousel: '滑动',
  stack: '卡片堆叠',
};

/** Dash 卡片的视觉样式。 */
export type CardStyle = 'default' | 'custom' | 'cartoon';

export const CARD_STYLES: CardStyle[] = ['default', 'custom', 'cartoon'];

export const CARD_STYLE_LABELS: Record<CardStyle, string> = {
  default: '默认',
  custom: '自定义颜色',
  cartoon: '卡通样式',
};

/** 课程块底色样式。 */
export type CourseBackground = 'plain' | 'grid' | 'stripe';

export const COURSE_BACKGROUNDS: CourseBackground[] = ['plain', 'grid', 'stripe'];

export const COURSE_BACKGROUND_LABELS: Record<CourseBackground, string> = {
  plain: '纯色',
  grid: '网格',
  stripe: '斑马纹',
};

/** 卡片自定义颜色默认值，与深色主卡一致。 */
export const DEFAULT_CARD_COLOR = '#26262A';

/** 全局皮肤：经典极简（现状） / 毛玻璃。 */
export type AppSkin = 'default' | 'glass';

export const APP_SKINS: AppSkin[] = ['default', 'glass'];

export const APP_SKIN_LABELS: Record<AppSkin, string> = {
  default: '经典极简',
  glass: '毛玻璃',
};

/** 页面背景模式：跟随皮肤底色 / 两套预设渐变 / 自定义纯色 / 自定义图片。 */
export type HomeBgMode = 'default' | 'mist' | 'zen' | 'color' | 'image';

export const HOME_BG_MODES: HomeBgMode[] = ['default', 'mist', 'zen', 'color', 'image'];

export const HOME_BG_MODE_LABELS: Record<HomeBgMode, string> = {
  default: '默认底色',
  mist: '简约预设 · 晨雾冰川（蓝紫微光）',
  zen: '简约预设 · 暖阳竹影（米白翠竹）',
  color: '纯色调色盘',
  image: '自定义图片',
};

/** 首页自定义背景色默认值：冰川浅蓝。 */
export const DEFAULT_HOME_BG_COLOR = '#EEF2F9';

/** 调色盘下方的快捷色点（果味莫兰迪 / 马卡龙）。 */
export const HOME_BG_PRESETS: { label: string; color: string }[] = [
  { label: '冰川蓝', color: '#E8F0FE' },
  { label: '薄荷青', color: '#E6F4EA' },
  { label: '樱花粉', color: '#FCE8E6' },
  { label: '奶油杏', color: '#FEF7E0' },
  { label: '薰衣草', color: '#F3E8FD' },
  { label: '迷雾灰', color: '#F1F5F9' },
  { label: '深空蓝', color: '#0F172A' },
  { label: '暗夜紫', color: '#1E1B4B' },
];



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
