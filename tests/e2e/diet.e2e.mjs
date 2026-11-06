import { sleep } from './browser.mjs';

/** P4 饮食：按餐次添加、总热量、未填热量、编辑、删除、刷新持久化 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickText('饮食');
  await page.waitForText('今天还没有饮食记录');

  // 午餐：鸡胸肉饭 520 kcal
  await page.clickLabel('添加饮食');
  await page.waitForText('今日饮食添加');
  await page.clickText('午餐');
  await page.fill('例如：鸡胸肉饭', '鸡胸肉饭');
  await page.fill('例如：520', '520');
  await page.clickText('保存');
  await page.waitForText('鸡胸肉饭');
  await page.waitForText('未记录');
  await page.waitForText('520');

  // 早餐：燕麦牛奶 320 kcal（总数变 840）
  await page.clickLabel('添加饮食');
  await page.waitForText('今日饮食添加');
  await page.clickText('早餐');
  await page.fill('例如：鸡胸肉饭', '燕麦牛奶');
  await page.fill('例如：520', '320');
  await page.clickText('保存');
  await page.waitForText('燕麦牛奶');

  // 加餐：苹果，不填热量
  await page.clickLabel('添加饮食');
  await page.waitForText('今日饮食添加');
  await page.clickText('加餐');
  await page.fill('例如：鸡胸肉饭', '苹果');
  await page.clickText('保存');
  await page.waitForText('未填热量');

  // 编辑第一条（燕麦牛奶）热量为 350
  await page.clickText('编辑');
  await page.waitForText('编辑饮食记录');
  await page.fill('例如：520', '350');
  await page.clickText('保存');
  await page.waitForText('350 kcal');

  // 删除第一条（燕麦牛奶）
  await page.clickText('删除');
  await page.waitForText('删除这条饮食记录？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForNoText('燕麦牛奶');
  await page.waitForText('鸡胸肉饭');

  // 刷新后数据仍在
  await page.reload();
  await page.clickText('饮食');
  await page.waitForText('鸡胸肉饭');
  await page.waitForText('苹果');
}
