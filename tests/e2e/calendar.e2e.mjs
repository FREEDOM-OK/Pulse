import { sleep } from './browser.mjs';

function dateStr(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function lastMonthDate(day = 15) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  date.setDate(day);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(day).padStart(2, '0')}`;
}

/** P7 日历回顾：四色点、当日明细分组、切月、无记录日期 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  const now = new Date();
  await page.waitForText(`${now.getMonth() + 1}月${now.getDate()}日`);
  await page.clickLabel('查看日历回顾');
  await page.waitForText('日历回顾');
  await page.waitForText('计划');
  await page.waitForText('健身');
  await page.waitForText('饮食');

  // 今天的日期格应该带有模块描述（计划 / 健身 / 饮食）
  await page.waitForLabel(`日历 ${dateStr(0)} 计划 健身 饮食`);

  // 明天有批量添加的任务（计划）
  await page.clickLabelContaining(`日历 ${dateStr(1)}`, -1);
  await page.waitForText('晨读');
  await page.waitForText('计划');

  // 切到上个月，选一个没有数据的日子（取最新渲染的日历页面）
  await page.clickLabel('上个月', -1);
  await sleep(400);
  const emptyDate = lastMonthDate(15);
  await page.clickLabelContaining(`日历 ${emptyDate}`, -1);
  await page.waitForText('这天没有记录');

  // 回到今天
  await page.clickLabel('下个月', -1);
  await sleep(400);
  await page.clickLabelContaining(`日历 ${dateStr(0)}`, -1);
  await page.waitForText('计划');
  await page.waitForText('健身');
}
