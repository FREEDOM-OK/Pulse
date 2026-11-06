import { sleep } from './browser.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

/** P2 今日计划：添加 / 3 天批量 / 勾选 / 编辑 / 删除 / 重新加载持久化 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('首页');

  // 进入今日计划
  await page.clickText('今日计划');
  await page.waitForText('完成 0/0');
  await page.waitForText('这一天还没有任务');

  // 添加一条带时间的任务
  await page.clickLabel('添加任务');
  await page.waitForText('添加任务');
  await page.fill('例如：写周报', '写周报');
  await page.fill('补充说明', '周五下班前交');
  await page.fill('09:00', '09:30');
  await page.clickText('保存');
  await page.waitForText('写周报');
  await page.waitForText('09:30');
  await page.waitForText('完成 0/1');

  // 重新加载页面，数据应仍在（本地存储持久化）
  await page.reload();
  await page.clickText('今日计划');
  await page.waitForText('写周报');

  // 勾选完成
  await page.clickLabel('标记为完成');
  await page.waitForText('完成 1/1');

  // 编辑任务内容
  await page.clickText('写周报');
  await page.waitForText('编辑任务');
  await page.fill('例如：写周报', '写月报');
  await page.clickText('保存');
  await page.waitForText('写月报');

  // 3 天批量添加
  await page.clickLabel('添加任务');
  await page.waitForText('添加任务');
  await page.fill('例如：写周报', '晨读');
  await page.clickText('今天起 3 天');
  await page.clickText('保存');
  await page.waitForText('晨读');

  const today = new Date();
  const tomorrowLabel = formatMonthDay(new Date(today.getTime() + DAY_MS));
  await page.clickLabel('后一天');
  await page.waitForText('晨读');
  await page.waitForText(tomorrowLabel);
  await page.clickLabel('前一天');
  await page.waitForText('晨读');

  // 删除任务（点击滑出后的删除按钮）
  await page.clickText('删除');
  await page.waitForText('删除任务？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForNoText('写月报');

  // 今天的批量任务仍在
  await page.waitForText('晨读');
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
