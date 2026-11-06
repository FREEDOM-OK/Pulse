/** 数据库行类型与领域常量。 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

export type ExerciseCategory = '胸' | '背' | '腿' | '肩' | '手臂' | '核心' | '有氧';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  '胸',
  '背',
  '腿',
  '肩',
  '手臂',
  '核心',
  '有氧',
];

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
  created_at: string;
}

export interface MemoRow {
  id: number;
  content: string;
  tags: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export interface ExerciseRow {
  id: number;
  name: string;
  category: string;
  is_preset: number;
  created_at: string;
}

export interface TrainingItemRow {
  id: number;
  date: string;
  exercise_id: number | null;
  exercise_name: string;
  reps: number;
  weight: number;
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
  completed_at: string;
  sort_order: number;
}

export interface DietRecordRow {
  id: number;
  date: string;
  meal_type: MealType;
  content: string;
  calories: number | null;
  created_at: string;
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
