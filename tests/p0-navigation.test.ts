import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TAB_ITEMS } from '@/constants/tabs';

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src', 'app');

describe('P0 底部导航结构', () => {
  it('恰好 5 个 Tab，顺序与 PRDv1.1 一致', () => {
    expect(TAB_ITEMS.map((t) => t.name)).toEqual([
      'index',
      'today',
      'fitness',
      'games',
      'settings',
    ]);
  });

  it('Tab 标题为中文且与 PRDv1.1 一致', () => {
    expect(TAB_ITEMS.map((t) => t.title)).toEqual(['首页', '今日计划', '健身', '游戏', '设置']);
  });

  it('Tab 名称不重复', () => {
    const names = TAB_ITEMS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('每个 Tab 都有对应的路由文件', () => {
    for (const tab of TAB_ITEMS) {
      const file = path.join(APP_DIR, '(tabs)', `${tab.name}.tsx`);
      expect(fs.existsSync(file), `缺少路由文件 ${file}`).toBe(true);
    }
  });

  it('存在 (tabs) 布局与日历回顾二级页', () => {
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', '_layout.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, 'calendar.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(APP_DIR, '_layout.tsx'))).toBe(true);
  });

  it('旧模板路由已移除，避免与 (tabs) 路由冲突', () => {
    for (const old of ['index.tsx', 'today.tsx', 'fitness.tsx', 'diet.tsx', 'settings.tsx']) {
      expect(fs.existsSync(path.join(APP_DIR, old))).toBe(false);
    }
  });
});
