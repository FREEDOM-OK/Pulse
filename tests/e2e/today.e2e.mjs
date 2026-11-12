import { sleep } from './browser.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

/** P2 今日计划：混合列表、新建任务/备忘、勾选、长按编辑、3 天批量、日期切换、持久化 */
export async function run(page, baseUrl) {
  await page.goto(`${baseUrl}/today`);
  await page.waitForText('Today');
  await page.waitForText('这一天还没有安排');

  // 从列表尾部「＋ 新建」建一条带时间的任务
  await page.clickLabel('新建任务或备忘');
  await page.waitForText('新建任务');
  await page.clickText('新建任务');
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
  await page.clickLabel('计划');
  await page.waitForText('写周报');

  // 日历圆点：有任务的日子，日期条里对应的日子带「有记录」
  const todayStr = dateStr(new Date());
  await page.waitForLabel(`日期 ${todayStr} 有记录`);
  await page.clickLabel('打开日历');
  await page.waitForLabel(`选择日期 ${todayStr} 有记录`);
  await page.clickLabel(`选择日期 ${todayStr} 有记录`);
  await sleep(300);

  // 勾选完成：任务平铺沉到列表底部，不再进入折叠分组
  await page.clickLabel('标记为完成');
  await page.waitForText('完成 1/1');
  await page.waitForText('写周报');
  await page.waitForLabel('标记为未完成');
  if (await page.has('已完成 1 项')) throw new Error('不应再出现已完成折叠分组');

  // 取消勾选后回到未完成区
  await page.clickLabel('标记为未完成');
  await page.waitForText('完成 0/1');

  // 编辑任务内容走长按菜单
  await page.longPressText('写周报');
  await page.waitForLabel('编辑');
  await page.clickLabel('编辑');
  await page.waitForText('编辑任务');
  await page.fill('例如：写周报', '写月报');
  await page.clickText('保存');
  await page.waitForText('写月报');

  // 3 天批量添加
  await page.clickLabel('新建任务或备忘');
  await page.clickText('新建任务');
  await page.waitForText('添加任务');
  await page.fill('例如：写周报', '晨读');
  await page.clickText('今天起 3 天');
  await page.clickText('保存');
  await page.waitForText('晨读');

  // 点日期条切到明天，批量的任务应出现在明天
  const tomorrow = new Date(Date.now() + DAY_MS);
  await page.clickLabelContaining(`日期 ${dateStr(tomorrow)}`);
  await page.waitForText('晨读');
  await page.waitForText(formatMonthDay(tomorrow));
  await page.clickLabelContaining(`日期 ${todayStr}`);
  await page.waitForText('晨读');

  // 长按任务弹出菜单，删除任务
  await page.longPressText('写月报');
  await page.waitForLabel('删除');
  await page.clickLabel('删除');
  await page.waitForText('删除任务？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForNoText('写月报');

  // 今天的批量任务仍在
  await page.waitForText('晨读');

  // 再建一条备忘，验证置顶与备忘样式进入列表
  await page.clickLabel('新建任务或备忘');
  await page.clickText('新建备忘');
  await page.waitForText('新建备忘');
  await page.fill('例如：周五前交房租', '周五前交房租');
  await page.clickLabel('置顶备忘');
  await page.clickText('保存');
  await page.waitForText('周五前交房租');
  await page.waitForText('置顶');
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function dateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}