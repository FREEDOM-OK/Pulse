/**
 * 底部导航配置：4 个 Tab + 中间凸起的新建按钮。
 * 游戏已改为二级页（/games），不再占用 Tab；
 * 第三个 Tab 可在健身与课表之间切换（PRDv1.2.2 第 2.5 节）。
 */

import type { SymbolViewProps } from 'expo-symbols';

import type { MiddleTab } from '@/db/types';

export type TabIcon = NonNullable<SymbolViewProps['name']>;

export interface TabItem {
  name: string;
  title: string;
  icon: TabIcon;
  /** 该项不是 Tab 路由，点击要走 router.push（目前只有课表）。 */
  route?: string;
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

const FITNESS: TabItem = {
  name: 'fitness',
  title: '健身',
  icon: {
    ios: 'figure.strengthtraining.traditional',
    android: 'fitness_center',
    web: 'fitness_center',
  },
};

const TIMETABLE: TabItem = {
  name: 'timetable',
  title: '课表',
  icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  route: '/timetable',
};

const LAST: TabItem = {
  name: 'settings',
  title: '我的',
  icon: { ios: 'person.fill', android: 'person', web: 'person' },
};

/** 按「第三个标签」设置生成 4 个 Tab：首页 / 计划 / 健身或课表 / 我的。 */
export function buildTabItems(middle: MiddleTab): TabItem[] {
  return [FIRST[0], FIRST[1], middle === 'timetable' ? TIMETABLE : FITNESS, LAST];
}

/** 默认配置（第三格为健身），保持旧引用可用。 */
export const TAB_ITEMS: TabItem[] = buildTabItems('fitness');

/** 左侧两个 Tab 排在凸起按钮前面，右侧两个排在后面。 */
export const TAB_LEFT = TAB_ITEMS.slice(0, 2);
export const TAB_RIGHT = TAB_ITEMS.slice(2);

export function tabItemByName(name: string): TabItem | undefined {
  return TAB_ITEMS.find((tab) => tab.name === name);
}