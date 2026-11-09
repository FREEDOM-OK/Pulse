import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  getHomeCards,
  getSortMode,
  setHomeCards,
  setSortMode,
  getPeriodTimes,
  setPeriodTimes,
  getTermConfig,
  setTermConfig,
} from '@/db/repositories/settings';
import { DEFAULT_ENABLED_CARDS, DEFAULT_HOME_CARDS } from '@/db/types';

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src', 'app');

function readApp(relative: string) {
  return fs.readFileSync(path.join(APP_DIR, relative), 'utf8');
}

afterEach(() => {
  resetDriverForTests();
});

describe('万事卡设置（PRDv1.2 P6）', () => {
  it('默认只开启健身/游戏/日历三张，课表默认关闭', async () => {
    await createTestContext();
    expect(await getHomeCards()).toEqual(['fitness', 'games', 'calendar']);
    expect(DEFAULT_ENABLED_CARDS).not.toContain('timetable');
    expect(DEFAULT_HOME_CARDS[0]).toBe('fitness');
  });

  it('保存顺序与开关后按保存的顺序读回，并过滤非法值', async () => {
    await createTestContext();
    await setHomeCards(['timetable', 'calendar', 'fitness']);
    expect(await getHomeCards()).toEqual(['timetable', 'calendar', 'fitness']);

    await setHomeCards([
      'calendar',
      // @ts-expect-error 故意传非法 id，验证过滤
      'unknown',
      'games',
      'calendar',
    ]);
    expect(await getHomeCards()).toEqual(['calendar', 'games']);
  });

  it('全部关闭时回落到默认开启列表，保证首页至少有一张卡', async () => {
    await createTestContext();
    await setHomeCards([]);
    expect(await getHomeCards()).toEqual(['fitness', 'games', 'calendar']);
  });

  it('排序模式默认备忘在前，可切换并持久化，非法值回默认', async () => {
    await createTestContext();
    expect(await getSortMode()).toBe('memo-first');
    await setSortMode('task-first');
    expect(await getSortMode()).toBe('task-first');
    await setSortMode('mixed');
    expect(await getSortMode()).toBe('mixed');
    // @ts-expect-error 故意传非法值
    await setSortMode('nope');
    expect(await getSortMode()).toBe('memo-first');
  });

  it('学期与节次设置可读写', async () => {
    await createTestContext();
    const initial = await getTermConfig();
    expect(initial.totalWeeks).toBe(18);
    expect(initial.startDate).toBeNull();

    await setTermConfig({ startDate: '2026-09-01', totalWeeks: 20 });
    const next = await getTermConfig();
    expect(next.startDate).toBe('2026-09-01');
    expect(next.totalWeeks).toBe(20);

    const times = await getPeriodTimes();
    expect(times.length).toBe(11);
    expect(times[0]).toEqual({ start: '08:00', end: '08:45' });
    await setPeriodTimes([
      { start: '08:10', end: '08:55' },
      { start: '09:00', end: '09:45' },
    ]);
    expect((await getPeriodTimes())[0]).toEqual({ start: '08:10', end: '08:55' });
  });
});

describe('卡片管理页与我的页入口（PRDv1.2 P6）', () => {
  it('卡片管理页存在并可在根导航打开', () => {
    const page = readApp('cards.tsx');
    expect(page).toContain('长按');
    expect(page).toContain('恢复默认');
    expect(page).toContain('主卡');
    expect(page).toContain('未显示');

    const layout = readApp('_layout.tsx');
    expect(layout).toContain('name="cards"');
    expect(layout).toContain('首页卡片');
  });

  it('卡片管理页用 Switch 控制开关，并写回 setHomeCards', () => {
    const page = readApp('cards.tsx');
    expect(page).toContain('<Switch');
    expect(page).toContain('setHomeCards');
    expect(page).toContain('bumpDataVersion');
    expect(page).toContain("'至少保留一张卡片'");
  });

  it('我的页有「首页卡片」与「列表排序」两个入口', () => {
    const page = readApp('(tabs)/settings.tsx');
    expect(page).toContain('首页卡片');
    expect(page).toContain("router.push('/cards')");
    expect(page).toContain('列表排序');
    expect(page).toContain('SORT_MODE_LABELS');
    expect(page).toContain('setSortMode');
  });

  it('首页与今日计划都读取排序模式', () => {
    const list = fs.readFileSync(
      path.join(ROOT, 'src', 'components', 'today', 'today-list.tsx'),
      'utf8'
    );
    expect(list).toContain('getSortMode');
    const home = readApp('(tabs)/index.tsx');
    expect(home).toContain('<TodayList');
  });
});