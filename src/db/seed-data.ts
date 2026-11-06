import type { PresetExerciseCategory, TrackingType } from './types';

export interface PresetExercise {
  name: string;
  category: PresetExerciseCategory;
  trackingType: TrackingType;
}

/** 基础必备动作。用户清空全部数据后也会保留。 */
export const PRESET_EXERCISES: PresetExercise[] = [
  // 胸
  { name: '坐姿推胸', category: '胸', trackingType: 'sets' },
  { name: '哑铃飞鸟', category: '胸', trackingType: 'sets' },
  { name: '杠铃卧推', category: '胸', trackingType: 'sets' },
  { name: '哑铃卧推', category: '胸', trackingType: 'sets' },
  { name: '蝴蝶机夹胸', category: '胸', trackingType: 'sets' },
  { name: '绳索夹胸', category: '胸', trackingType: 'sets' },
  { name: '俯卧撑', category: '胸', trackingType: 'sets' },

  // 背
  { name: '高位下拉', category: '背', trackingType: 'sets' },
  { name: '坐姿划船', category: '背', trackingType: 'sets' },
  { name: '哑铃单臂划船', category: '背', trackingType: 'sets' },
  { name: '杠铃俯身划船', category: '背', trackingType: 'sets' },
  { name: '引体向上', category: '背', trackingType: 'sets' },
  { name: '直臂下拉', category: '背', trackingType: 'sets' },
  { name: '杠铃硬拉', category: '背', trackingType: 'sets' },

  // 腿
  { name: '倒蹬', category: '腿', trackingType: 'sets' },
  { name: '杠铃深蹲', category: '腿', trackingType: 'sets' },
  { name: '哑铃高脚杯深蹲', category: '腿', trackingType: 'sets' },
  { name: '坐姿腿屈伸', category: '腿', trackingType: 'sets' },
  { name: '俯卧腿弯举', category: '腿', trackingType: 'sets' },
  { name: '保加利亚分腿蹲', category: '腿', trackingType: 'sets' },
  { name: '罗马尼亚硬拉', category: '腿', trackingType: 'sets' },

  // 肩
  { name: '坐姿推肩', category: '肩', trackingType: 'sets' },
  { name: '哑铃侧平举', category: '肩', trackingType: 'sets' },
  { name: '哑铃前平举', category: '肩', trackingType: 'sets' },
  { name: '俯身反向飞鸟', category: '肩', trackingType: 'sets' },
  { name: '绳索面拉', category: '肩', trackingType: 'sets' },

  // 手臂
  { name: '哑铃交替弯举', category: '手臂', trackingType: 'sets' },
  { name: '杠铃弯举', category: '手臂', trackingType: 'sets' },
  { name: '绳索下压', category: '手臂', trackingType: 'sets' },
  { name: '哑铃颈后臂屈伸', category: '手臂', trackingType: 'sets' },
  { name: '仰卧臂屈伸', category: '手臂', trackingType: 'sets' },

  // 核心
  { name: '平板支撑', category: '核心', trackingType: 'duration' },
  { name: '卷腹', category: '核心', trackingType: 'sets' },
  { name: '仰卧举腿', category: '核心', trackingType: 'sets' },
  { name: '悬垂举腿', category: '核心', trackingType: 'sets' },
  { name: '俄罗斯转体', category: '核心', trackingType: 'sets' },
  { name: '死虫子', category: '核心', trackingType: 'sets' },

  // 有氧
  { name: '爬坡快走', category: '有氧', trackingType: 'duration' },
  { name: '慢跑', category: '有氧', trackingType: 'duration' },
  { name: '椭圆机漫步', category: '有氧', trackingType: 'duration' },
  { name: '动感单车骑行', category: '有氧', trackingType: 'duration' },
  { name: '室内划船', category: '有氧', trackingType: 'duration' },
  { name: '台阶攀爬', category: '有氧', trackingType: 'duration' },
  { name: '跳绳', category: '有氧', trackingType: 'duration' },
];
