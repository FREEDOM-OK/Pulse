import { describe, expect, it } from 'vitest';
import { buildTabItems, TAB_ITEMS, TAB_LEFT, TAB_RIGHT, tabItemByName } from '@/constants/tabs';

describe('底部导航配置', () => {
  it('固定 4 个 Tab，顺序为首页/计划/健身/我的', () => {
    expect(TAB_ITEMS.map((tab) => tab.name)).toEqual(['index', 'today', 'fitness', 'settings']);
    expect(TAB_ITEMS.map((tab) => tab.title)).toEqual(['首页', '计划', '健身', '我的']);
  });

  it('游戏不再占用 Tab', () => {
    expect(TAB_ITEMS.some((tab) => tab.name === 'games')).toBe(false);
  });

  it('左右两组各两个 Tab，供中间凸起按钮分隔', () => {
    expect(TAB_LEFT.map((tab) => tab.name)).toEqual(['index', 'today']);
    expect(TAB_RIGHT.map((tab) => tab.name)).toEqual(['fitness', 'settings']);
    expect(TAB_LEFT.length + TAB_RIGHT.length).toBe(TAB_ITEMS.length);
  });

  it('Tab 名字唯一，且每个都有图标', () => {
    const names = TAB_ITEMS.map((tab) => tab.name);
    expect(new Set(names).size).toBe(names.length);
    for (const tab of TAB_ITEMS) {
      expect(tab.icon).toBeTruthy();
    }
  });

  it('可按路由名查回 Tab，未知名字返回 undefined', () => {
    expect(tabItemByName('today')?.title).toBe('计划');
    expect(tabItemByName('settings')?.title).toBe('我的');
    expect(tabItemByName('games')).toBeUndefined();
  });

  it('第三个标签可切换为课表，且带跳转路由', () => {
    const withFitness = buildTabItems('fitness');
    const withTimetable = buildTabItems('timetable');
    expect(withFitness.map((tab) => tab.name)).toEqual(['index', 'today', 'fitness', 'settings']);
    expect(withTimetable.map((tab) => tab.name)).toEqual([
      'index',
      'today',
      'timetable',
      'settings',
    ]);
    expect(withTimetable[2].title).toBe('课表');
    expect(withTimetable[2].route).toBe('/timetable');
    expect(withFitness[2].route).toBeUndefined();
  });
});