/**
 * 底部导航配置：4 个 Tab（首页 / 计划 / 第三个标签 / 我的）+ 中间凸起的新建按钮。
 *
 * v1.2.2（PRD_module 第 8 节）：
 * - 「健身 / 课表 / 日历」中被选进第三格的，就是真正的第 3 页（路由名 `middle`，带底栏）；
 * - 没被选中的只能从首页 Dash 或「我的」以二级页打开；
 * - 课表保持现状（独立全屏页 `/timetable`），第三格选课表时底栏点它仍然 push 进去。
 */

import type { SymbolViewProps } from 'expo-symbols';

import { MIDDLE_TAB_LABELS, type MiddleTab } from '@/db/types';

export type TabIcon = NonNullable<SymbolViewProps['name']>;

export interface TabItem {
  name: string;
  title: string;
  icon: TabIcon;
}

const FIRST: TabItem[] = [
  {
    name: 'index',
    title: '首页',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    name: 'today',
    title: '计划',
    icon: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  },
];

/** 第三格的图标随设置切。 */
export const MIDDLE_ICONS: Record<MiddleTab, TabIcon> = {
  fitness: {
    ios: 'figure.strengthtraining.traditional',
    android: 'fitness_center',
    web: 'fitness_center',
  },
  timetable: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  calendar: { ios: 'calendar', android: 'event', web: 'event' },
};

const LAST: TabItem = {
  name: 'settings',
  title: '我的',
  icon: { ios: 'person.fill', android: 'person', web: 'person' },
};

/** 按「第三个标签」设置生成 4 个 Tab：首页 / 计划 / 中间 / 我的。 */
export function buildTabItems(middle: MiddleTab): TabItem[] {
  const middleItem: TabItem = {
    name: 'middle',
    title: MIDDLE_TAB_LABELS[middle],
    icon: MIDDLE_ICONS[middle],
  };
  return [FIRST[0], FIRST[1], middleItem, LAST];
}

/** 默认配置（第三格为健身），保持旧引用可用。 */
export const TAB_ITEMS: TabItem[] = buildTabItems('fitness');

/** 左侧两个 Tab 排在凸起按钮前面，右侧两个排在后面。 */
export const TAB_LEFT = TAB_ITEMS.slice(0, 2);
export const TAB_RIGHT = TAB_ITEMS.slice(2);

export function tabItemByName(name: string): TabItem | undefined {
  return TAB_ITEMS.find((tab) => tab.name === name);
}