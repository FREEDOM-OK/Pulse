import { afterEach, describe, expect, it } from 'vitest';

import { resetDriverForTests } from '@/db/connection';
import { createMemo } from '@/db/repositories/memos';
import { searchRecords } from '@/db/repositories/search';
import { createTask } from '@/db/repositories/tasks';
import { addTrainingItem, completeSet } from '@/db/repositories/training';
import { createTestContext } from './helpers/node-driver';

afterEach(() => {
  resetDriverForTests();
});

describe('沉浸式搜索数据', () => {
  it('同时命中任务、备忘与健身记录，并保留所属日期', async () => {
    await createTestContext();
    await createTask({ date: '2026-11-08', title: '写周报', note: '发给老板' });
    await createMemo({ date: '2026-11-07', content: '买牛奶' });
    const itemId = await addTrainingItem({
      date: '2026-11-06',
      exerciseId: null,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    await completeSet(itemId, undefined, '2026-11-06');

    const task = await searchRecords('周报');
    expect(task).toHaveLength(1);
    expect(task[0]).toMatchObject({
      kind: 'task',
      title: '写周报',
      date: '2026-11-08',
    });

    const byNote = await searchRecords('老板');
    expect(byNote[0]).toMatchObject({ kind: 'task', title: '写周报' });

    const memo = await searchRecords('牛奶');
    expect(memo[0]).toMatchObject({
      kind: 'memo',
      title: '买牛奶',
      date: '2026-11-07',
    });

    const fitness = await searchRecords('卧推');
    expect(fitness[0]).toMatchObject({
      kind: 'fitness',
      title: '卧推',
      subtitle: '1 组训练',
      date: '2026-11-06',
    });
  });

  it('空关键词返回最近记录，按日期倒序', async () => {
    await createTestContext();
    await createTask({ date: '2026-11-01', title: '旧任务' });
    await createTask({ date: '2026-11-08', title: '新任务' });
    await createMemo({ date: '2026-11-05', content: '中间备忘' });

    const results = await searchRecords('');
    expect(results).toHaveLength(3);
    expect(results.map((item) => item.date)).toEqual([
      '2026-11-08',
      '2026-11-05',
      '2026-11-01',
    ]);
  });

  it('无匹配时返回空数组', async () => {
    await createTestContext();
    await createTask({ date: '2026-11-08', title: '写周报' });

    expect(await searchRecords('不存在的关键词')).toEqual([]);
  });
});