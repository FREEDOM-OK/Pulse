import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import { countRecordsInRange } from '@/db/repositories/calendar';
import { createTask } from '@/db/repositories/tasks';
import { createMemo } from '@/db/repositories/memos';
import { createEvent } from '@/db/repositories/events';
import { addTrainingItem, completeSet } from '@/db/repositories/training';

const ROOT = path.resolve(__dirname, '..');

function readApp(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', 'app', relative), 'utf8');
}

afterEach(() => {
  resetDriverForTests();
});

describe('首页结构（PRDv1.2 P5）', () => {
  it('首页包含问候、日期、Dash 卡片与 Tasks 四段', () => {
    const page = readApp('(tabs)/index.tsx');
    expect(page).toContain('Hey，');
    expect(page).toContain('今天是');
    expect(page).toContain('<DashCarousel');
    expect(page).toContain('Dash');
    expect(page).toContain('Tasks');
  });

  it('首页不再有上下翻页、内嵌日历与悬浮 FAB', () => {
    const page = readApp('(tabs)/index.tsx');
    expect(page).not.toContain('PanResponder');
    expect(page).not.toContain('BackHandler');
    expect(page).not.toContain('CalendarPanel');
    expect(page).not.toContain('FAB');
    expect(fs.existsSync(path.join(ROOT, 'src', 'lib', 'home-pager.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'src', 'components', 'home', 'mini-calendar.tsx'))).toBe(
      false
    );
  });

  it('首页与今日计划复用同一个混合列表组件', () => {
    expect(readApp('(tabs)/index.tsx')).toContain("from '@/components/today/today-list'");
    expect(readApp('(tabs)/today.tsx')).toContain("from '@/components/today/today-list'");
  });
});

describe('首页卡片数据', () => {
  it('countRecordsInRange 统计任务/备忘/事件/健身组', async () => {
    await createTestContext();
    await createTask({ date: '2026-11-08', title: '写周报' });
    await createMemo({ date: '2026-11-08', content: '买牛奶' });
    await createEvent({ date: '2026-11-08', type: 'expense', title: '买键盘', amount: 399 });
    const itemId = await addTrainingItem({
      date: '2026-11-08',
      exerciseId: 1,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    await completeSet(itemId);

    expect(await countRecordsInRange('2026-11-08', '2026-11-08')).toBe(4);
    expect(await countRecordsInRange('2026-11-07', '2026-11-07')).toBe(0);
    expect(await countRecordsInRange('2026-11-01', '2026-11-30')).toBe(4);
  });
});