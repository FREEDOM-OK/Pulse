import { sleep } from './browser.mjs';

/** P5 游戏：添加想玩 -> 玩了弹窗（时长/星级/体验）-> 已玩记录 -> 编辑 -> 删除 -> 刷新持久化 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickText('游戏');
  await page.waitForText('想玩清单是空的');

  // 添加想玩的游戏
  await page.clickLabel('添加想玩的游戏');
  await page.waitForText('添加想玩的游戏');
  await page.fill('例如：塞尔达：王国之泪', '塞尔达');
  await page.fill('为什么想玩', '听说探索感很强');
  await page.clickText('保存');
  await page.waitForText('塞尔达');
  await page.waitForText('听说探索感很强');

  // 点了
  await page.clickText('玩了');
  await page.waitForText('玩了：塞尔达');
  await page.fill('0', '2', 0);
  await page.fill('0', '30', 1);
  await page.fill('玩起来怎么样', '探索感很强，地图很大');
  await page.clickLabel('4 星', -1);
  await page.clickText('保存');

  // 想玩清单清空，已玩记录 +1
  await page.waitForText('想玩清单是空的');
  await page.waitForText('想玩 0 · 已玩 1');

  // 切到已玩记录
  await page.clickText('已玩记录');
  await page.waitForText('探索感很强，地图很大');
  await page.waitForText('2 小时 30 分钟');
  await page.waitForLabel('评分 4 星');

  // 编辑评分到 5 星
  await page.clickText('探索感很强，地图很大');
  await page.waitForText('编辑已玩记录');
  await page.clickLabel('5 星', -1);
  await page.clickText('保存');
  await sleep(400);
  await page.waitForLabel('评分 5 星');

  // 刷新后仍在
  await page.reload();
  await page.clickText('游戏');
  await page.clickText('已玩记录');
  await page.waitForText('塞尔达');

  // 删除已玩记录
  await page.clickText('删除');
  await page.waitForText('删除这条游玩记录？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForText('还没有游玩记录');
}
