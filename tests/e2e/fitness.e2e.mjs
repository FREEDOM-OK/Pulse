import { sleep } from './browser.mjs';

/** P3 健身：动作选择、自定义动作、按时间计、完成打卡、按日回看 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickText('健身');
  await page.waitForText('待训练');
  await page.waitForText('这个日期还没有安排训练');

  // 今日标题保留「今日」，并可从右上角添加动作
  await page.waitForText('今日 0 组');
  await page.clickText('添加');
  await page.waitForText('选择动作');
  await page.waitForText('自定义类');
  await page.clickText('杠铃卧推');
  await page.clickText('添加到所选日期');
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
  await page.fillByLabel('杠铃卧推 每组次数', '5');
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
  await page.clickLabel('删除杠铃卧推第4组');
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
  await page.waitForText('杠铃卧推');

  // 非今日不显示「今日」，添加的按时间动作只进入所选日期
  await page.clickLabel('后一天');
  await page.waitForText('这个日期还没有安排训练');
  await page.waitForNoText('今日 0 组');
  await page.clickText('添加');
  await page.waitForText('选择动作');
  await page.clickText('自定义类');
  await page.waitForText('还没有自定义动作');
  await page.clickText('＋ 新增自定义动作');
  await page.waitForText('新增自定义动作');
  await page.fill('例如：壶铃摇摆', '壶铃摇摆');
  await page.clickText('按时间计');
  await page.clickText('确定');
  await page.waitForText('壶铃摇摆');
  await page.clickText('壶铃摇摆');
  await page.clickText('添加到所选日期');
  await page.waitForLabel('壶铃摇摆 运动时间');
  const hasDurationWeightInput = await page.evaluate(
    `!!document.querySelector('[aria-label="壶铃摇摆 重量"]')`
  );
  if (hasDurationWeightInput) throw new Error('按时间动作不应显示重量输入框');
  await page.waitForText('已练 0 次');
  await page.fillByLabel('壶铃摇摆 运动时间', '20');
  await page.blur();
  await sleep(300);
  await page.clickText('完成');
  await page.waitForText('20分钟');

  // 回到今天仍只有原来的杠铃卧推记录
  await page.clickLabel('前一天');
  await page.waitForText('共 3 组');
  await page.waitForNoText('壶铃摇摆');
}
