import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  addDietRecord,
  deleteDietRecord,
  getDietSummary,
  listDietByDate,
  listDietInRange,
  updateDietRecord,
} from '@/db/repositories/diet';

const DATE = '2026-11-06';

afterEach(() => {
  resetDriverForTests();
});

describe('P4 饮食：餐次与汇总', () => {
  it('修改餐次后从旧餐次移到新餐次', async () => {
    await createTestContext();
    await addDietRecord({ date: DATE, mealType: 'breakfast', content: '燕麦牛奶', calories: 320 });
    const [record] = await listDietByDate(DATE);

    await updateDietRecord(record.id, { mealType: 'snack' });
    const [updated] = await listDietByDate(DATE);
    expect(updated.meal_type).toBe('snack');
  });

  it('填 0 热量与不填热量区分：0 计入合计但不显示未填', async () => {
    await createTestContext();
    await addDietRecord({ date: DATE, mealType: 'lunch', content: '白开水', calories: 0 });
    await addDietRecord({ date: DATE, mealType: 'lunch', content: '口香糖' });

    const records = await listDietByDate(DATE);
    expect(records[0].calories).toBe(0);
    expect(records[1].calories).toBeNull();
    expect(await getDietSummary(DATE)).toEqual({ totalCalories: 0, records: 2 });
  });

  it('删除最后一条后合计归零', async () => {
    await createTestContext();
    await addDietRecord({ date: DATE, mealType: 'dinner', content: '面条', calories: 600 });
    const [record] = await listDietByDate(DATE);
    await deleteDietRecord(record.id);

    expect(await listDietByDate(DATE)).toHaveLength(0);
    expect(await getDietSummary(DATE)).toEqual({ totalCalories: 0, records: 0 });
  });

  it('按日期区间查询只返回区间内的记录', async () => {
    await createTestContext();
    await addDietRecord({ date: '2026-11-01', mealType: 'lunch', content: 'A', calories: 100 });
    await addDietRecord({ date: '2026-11-06', mealType: 'lunch', content: 'B', calories: 200 });
    await addDietRecord({ date: '2026-12-01', mealType: 'lunch', content: 'C', calories: 300 });

    const rows = await listDietInRange('2026-11-01', '2026-11-30');
    expect(rows.map((row) => row.content)).toEqual(['A', 'B']);
  });
});
