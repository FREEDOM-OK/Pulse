import { describe, expect, it } from 'vitest';
import { buildTabItems, TAB_ITEMS, TAB_LEFT, TAB_RIGHT, tabItemByName } from '@/constants/tabs';

describe('底部导航配置', () => {
  it('固定 4 个 Tab，顺序为首页/计划/第三格/我的', () => {
    expect(TAB_ITEMS.map((tab) => tab.name)).toEqual(['index', 'today', 'middle', 'settings']);
    expect(TAB_ITEMS.map((tab) => tab.title)).toEqual(['首页', '计划', '健身', '我的']);
  });

  it('游戏不再占用 Tab', () => {
    expect(TAB_ITEMS.some((tab) => tab.name === 'games')).toBe(false);
  });

  it('左右两组各两个 Tab，供中间凸起按钮分隔', () => {
    expect(TAB_LEFT.map((tab) => tab.name)).toEqual(['index', 'today']);
    expect(TAB_RIGHT.map((tab) => tab.name)).toEqual(['middle', 'settings']);
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
    expect(tabItemByName('middle')?.title).toBe('健身');
    expect(tabItemByName('games')).toBeUndefined();
  });

  it('第三个标签在健身/课表/日历之间切换时，路由名恒为 middle、标题与图标跟着变', () => {
    const fitness = buildTabItems('fitness');
    const timetable = buildTabItems('timetable');
    const calendar = buildTabItems('calendar');

    for (const items of [fitness, timetable, calendar]) {
      expect(items.map((tab) => tab.name)).toEqual(['index', 'today', 'middle', 'settings']);
    }

    expect(fitness[2].title).toBe('健身');
    expect(timetable[2].title).toBe('课表');
    expect(calendar[2].title).toBe('日历');

    // 三种图标的 android 名互不相同，切换时用户能看出区别（icon 可能是字符串或多平台对象）。
    expect(JSON.stringify(fitness[2].icon)).toContain('android":"fitness_center');
    expect(JSON.stringify(timetable[2].icon)).toContain('android":"calendar_month');
    expect(JSON.stringify(calendar[2].icon)).toContain('android":"event');
  });
});