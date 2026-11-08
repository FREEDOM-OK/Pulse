import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import { QUICK_MEMO_MAX_LENGTH, getQuickMemo, saveQuickMemo } from '@/db/repositories/memo';

afterEach(() => {
  resetDriverForTests();
});

describe('P6 首页备忘录', () => {
  it('没写过时是空字符串', async () => {
    await createTestContext();
    expect(await getQuickMemo()).toBe('');
  });

  it('保存后能读回，并去掉首尾空白', async () => {
    await createTestContext();
    await saveQuickMemo('  买牛奶和鸡蛋  ');
    expect(await getQuickMemo()).toBe('买牛奶和鸡蛋');
  });

  it('再次保存会覆盖上一次的内容', async () => {
    await createTestContext();
    await saveQuickMemo('第一版');
    await saveQuickMemo('第二版');
    expect(await getQuickMemo()).toBe('第二版');
  });

  it('留空保存等于清空', async () => {
    await createTestContext();
    await saveQuickMemo('要删掉的备忘');
    await saveQuickMemo('   ');
    expect(await getQuickMemo()).toBe('');
  });

  it('超长内容会截断到上限', async () => {
    await createTestContext();
    await saveQuickMemo('备'.repeat(QUICK_MEMO_MAX_LENGTH + 50));
    expect(await getQuickMemo()).toHaveLength(QUICK_MEMO_MAX_LENGTH);
  });
});