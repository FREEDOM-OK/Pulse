import { sleep } from './browser.mjs';

function dateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** P3 健身：动作选择、自定义动作、按时间计、完成打卡、按日回看 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickText('健身');
  await page.waitForText('待训练');
  await page.waitForText('还没有待训练的动作');

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

  // 日历圆点：练过的日子，日期条和月历里对应的日子下面都有一点
  const todayStr = dateStr(new Date());
  await page.waitForLabel(`日期 ${todayStr} 有记录`);
  await page.clickLabel('打开日历');
  await page.waitForLabel(`选择日期 ${todayStr} 有记录`);
  await page.clickLabel(`选择日期 ${todayStr} 有记录`);
  await sleep(300);

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

  // 长按第 4 组，弹出「删除」菜单
  await page.longPressText('第4组');
  await page.waitForLabel('删除');
  await page.clickLabel('删除');
  await page.waitForText('删除这组记录？');
  await page.clickText('确认删除');
  await page.waitForText('共 3 组');
  await page.waitForNoText('第4组');

  // 长按卡片弹出菜单，删除训练项目，历史记录仍保留
  await page.longPressLabel('训练项目 杠铃卧推');
  await page.waitForLabel('删除');
  await page.clickLabel('删除');
  await page.waitForText('删除这个训练项目？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForNoText('已练');
  await page.waitForText('共 3 组');
  await page.waitForText('杠铃卧推');

  // 待训练清单跨日期共享：切到后一天仍能看到已加的动作（这里卡片前面已删，故为空）
  await page.clickLabel('后一天');
  await page.waitForText('还没有待训练的动作');
  await page.waitForNoText('今日 0 组');
  await page.waitForText('共 0 组');
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

  // 回到今天：已完成仍是 3 组；壶铃摇摆的待训练卡片还在，但今天的记录里没有它
  await page.clickLabel('前一天');
  await page.waitForText('共 3 组');
  await page.waitForText('壶铃摇摆');
  await page.waitForNoText('20分钟');
}
