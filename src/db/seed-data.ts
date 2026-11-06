import type { ExerciseCategory } from './types';

/** 预置动作库（PRD 附录 A），首次启动写入数据库。 */
export const PRESET_EXERCISES: { name: string; category: ExerciseCategory }[] = [
  // 胸
  { name: '卧推', category: '胸' },
  { name: '上斜卧推', category: '胸' },
  { name: '哑铃卧推', category: '胸' },
  { name: '哑铃飞鸟', category: '胸' },
  { name: '器械夹胸', category: '胸' },
  { name: '俯卧撑', category: '胸' },
  { name: '双杠臂屈伸', category: '胸' },

  // 背
  { name: '硬拉', category: '背' },
  { name: '引体向上', category: '背' },
  { name: '高位下拉', category: '背' },
  { name: '坐姿划船', category: '背' },
  { name: '杠铃划船', category: '背' },
  { name: '单臂哑铃划船', category: '背' },
  { name: '直臂下压', category: '背' },

  // 腿
  { name: '深蹲', category: '腿' },
  { name: '腿举', category: '腿' },
  { name: '腿弯举', category: '腿' },
  { name: '腿屈伸', category: '腿' },
  { name: '箭步蹲', category: '腿' },
  { name: '罗马尼亚硬拉', category: '腿' },
  { name: '站姿提踵', category: '腿' },
  { name: '臀桥', category: '腿' },

  // 肩
  { name: '站姿推举', category: '肩' },
  { name: '哑铃推举', category: '肩' },
  { name: '侧平举', category: '肩' },
  { name: '前平举', category: '肩' },
  { name: '面拉', category: '肩' },
  { name: '反向飞鸟', category: '肩' },

  // 手臂
  { name: '杠铃弯举', category: '手臂' },
  { name: '哑铃弯举', category: '手臂' },
  { name: '锤式弯举', category: '手臂' },
  { name: '绳索下压', category: '手臂' },
  { name: '窄距卧推', category: '手臂' },
  { name: '颈后臂屈伸', category: '手臂' },

  // 核心
  { name: '卷腹', category: '核心' },
  { name: '平板支撑', category: '核心' },
  { name: '悬垂举腿', category: '核心' },
  { name: '俄罗斯转体', category: '核心' },
  { name: '登山跑', category: '核心' },
  { name: '侧支撑', category: '核心' },

  // 有氧
  { name: '跑步机', category: '有氧' },
  { name: '椭圆机', category: '有氧' },
  { name: '划船机', category: '有氧' },
  { name: '动感单车', category: '有氧' },
  { name: '跳绳', category: '有氧' },
];
