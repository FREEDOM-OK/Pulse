/**
 * 底部导航配置：4 个 Tab + 中间凸起的新建按钮。
 * 游戏已改为二级页（/games），不再占用 Tab。
 */

import type { SymbolViewProps } from 'expo-symbols';

export type TabIcon = NonNullable<SymbolViewProps['name']>;

export interface TabItem {
  name: string;
  title: string;
  icon: TabIcon;
}

export const TAB_ITEMS: TabItem[] = [
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
  {
    name: 'fitness',
    title: '健身',
    icon: {
      ios: 'figure.strengthtraining.traditional',
      android: 'fitness_center',
      web: 'fitness_center',
    },
  },
  {
    name: 'settings',
    title: '我的',
    icon: { ios: 'person.fill', android: 'person', web: 'person' },
  },
];

/** 左侧两个 Tab 排在凸起按钮前面，右侧两个排在后面。 */
export const TAB_LEFT = TAB_ITEMS.slice(0, 2);
export const TAB_RIGHT = TAB_ITEMS.slice(2);

export function tabItemByName(name: string): TabItem | undefined {
  return TAB_ITEMS.find((tab) => tab.name === name);
}