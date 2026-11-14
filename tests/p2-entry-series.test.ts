import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  createTask,
  deleteTask,
  getAutoPostponeIds,
  listTasksByDate,
  rolloverAutoPostponeTasks,
  setTaskAutoPostpone,
  toggleTask,
} from '@/db/repositories/tasks';
import { createMemoSeries, listMemosByDate } from '@/db/repositories/memos';

const TODAY = '2026-11-13';
const YESTERDAY = '2026-11-12';

afterEach(() => {
  resetDriverForTests();
});

describe('自动延期：过期未完成任务顺延', () => {
  it('只顺延开启开关且未完成的任务，未来任务与普通任务不动', async () => {
    await createTestContext();
    const flagged = await createTask({ date: YESTERDAY, title: '开启延期', autoPostpone: true });
    const plain = await createTask({ date: YESTERDAY, title: '普通任务' });
    const done = await createTask({ date: YESTERDAY, title: '已完成', autoPostpone: true });
    await toggleTask(done);
    const future = await createTask({ date: '2026-11-20', title: '未来任务', autoPostpone: true });

    expect(await rolloverAutoPostponeTasks(TODAY)).toBe(true);

    expect((await listTasksByDate(TODAY)).map((task) => task.title)).toEqual(['开启延期']);
    expect((await listTasksByDate(YESTERDAY)).map((task) => task.title)).toEqual([
      '普通任务',
      '已完成',
    ]);
    expect(await listTasksByDate('2026-11-20')).toHaveLength(1);

    // 顺延后再次执行不应再产生变更
    expect(await rolloverAutoPostponeTasks(TODAY)).toBe(false);

    const ids = await getAutoPostponeIds();
    expect(ids).toEqual(expect.arrayContaining([flagged, done, future]));
    expect(ids).not.toContain(plain);
  });

  it('删除任务时同步移出自动延期集合，编辑开关可增删', async () => {
    await createTestContext();
    const id = await createTask({ date: TODAY, title: '浇花' });

    await setTaskAutoPostpone(id, true);
    expect(await getAutoPostponeIds()).toContain(id);

    await setTaskAutoPostpone(id, false);
    expect(await getAutoPostponeIds()).not.toContain(id);

    await setTaskAutoPostpone(id, true);
    await deleteTask(id);
    expect(await getAutoPostponeIds()).not.toContain(id);
  });
});

describe('备忘：连续多天创建', () => {
  it('从起始日连写 3 天，备注时间与置顶同步', async () => {
    await createTestContext();
    await createMemoSeries({ date: TODAY, content: '交房租', time: '09:00', pinned: true }, 3);

    for (const date of ['2026-11-13', '2026-11-14', '2026-11-15']) {
      const memos = await listMemosByDate(date);
      expect(memos).toHaveLength(1);
      expect(memos[0]).toMatchObject({ content: '交房租', time: '09:00', pinned: 1 });
    }
  });
});