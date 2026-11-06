import { sleep } from './browser.mjs';

/** P3 健身：动作库选择、完成打卡、顺序编号、修改参数、撤销、删卡保史、按日回看 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickText('健身');
  await page.waitForText('待训练');
  await page.waitForText('今天还没有安排训练');

  // 从动作库添加「卧推」
  await page.clickText('动作库');
  await page.waitForText('选择动作');
  await page.clickText('卧推');
  await page.clickText('添加到今天');
  await page.waitForText('已练 0 组');

  // 连续完成 3 组
  await page.clickText('完成');
  await page.waitForText('第1组');
  await page.waitForText('已练 1 组');
  await page.clickText('完成');
  await page.waitForText('第2组');
  await page.clickText('完成');
  await page.waitForText('第3组');
  await page.waitForText('共 3 组');

  // 改次数后完成，新记录用新次数
  await page.fillByLabel('卧推 每组次数', '5');
  await page.blur();
  await sleep(300);
  await page.clickText('完成');
  await page.waitForText('共 4 组');
  const textWithFifth = await page.text();
  if (!textWithFifth.includes('5次')) {
    throw new Error('修改次数后新记录没有使用新的次数');
  }

  // 左滑第 4 组，露出「删除」按钮
  const moved = await page.swipeLeft('第4组');
  if (moved < 40) {
    throw new Error(`左滑没有把记录向左移出，只移动了 ${moved}px`);
  }

  // 删除第 4 组，剩余组重新编号
  await page.clickLabel('删除卧推第4组');
  await page.waitForText('删除这组记录？');
  await page.clickText('确认删除');
  await page.waitForText('共 3 组');
  await page.waitForNoText('第4组');

  // 删除卡片，历史记录仍保留
  await page.clickLabel('删除');
  await page.waitForText('删除这个训练项目？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForNoText('已练');
  await page.waitForText('共 3 组');
  await page.waitForText('卧推');

  // 切到后一天再回来，记录还在
  await page.clickLabel('后一天');
  await page.waitForText('今天还没有安排训练');
  await page.clickLabel('前一天');
  await page.waitForText('共 3 组');
}
