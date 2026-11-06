import { sleep } from './browser.mjs';

function todayStr() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** P6 首页：摘要、备忘增删改置顶、迷你月历跳转 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('今天');
  await page.waitForText('快速备忘');
  await page.waitForText('今日计划');
  await page.waitForText('kcal');

  // 添加两条备忘
  await page.clickLabel('添加备忘');
  await page.waitForText('添加备忘');
  await page.fill('例如：交房租', '交房租');
  await page.fill('例如：财务，生活', '财务，生活');
  await page.clickText('保存');
  await page.waitForText('交房租');
  await page.waitForText('#财务');
  await page.waitForText('#生活');

  await page.clickLabel('添加备忘');
  await page.waitForText('添加备忘');
  await page.fill('例如：交房租', '给车做保养');
  await page.fill('例如：财务，生活', '生活');
  await page.clickText('保存');
  await page.waitForText('给车做保养');

  // 置顶第一条，应排到最前
  await page.clickLabel('备忘操作 交房租');
  await page.waitForText('备忘操作');
  await page.clickText('置顶');
  await sleep(400);
  let text = await page.text();
  if (text.indexOf('交房租') > text.indexOf('给车做保养')) {
    throw new Error('置顶后备忘没有排到最前');
  }
  await page.waitForText('📌');

  // 刷新后备忘与置顶状态仍在
  await page.reload();
  await page.waitForText('交房租');
  text = await page.text();
  if (text.indexOf('交房租') > text.indexOf('给车做保养')) {
    throw new Error('刷新后置顶状态丢失');
  }

  // 点击迷你月历上的今天，进入日历回顾
  await page.clickLabel(`首页日历 ${todayStr()}`);
  await page.waitForText('日历回顾');

  // 返回首页（整页重新进入，避免遗留未卸载的页面实例）
  await page.goto(baseUrl);
  await page.waitForText('快速备忘');

  // 删除备忘
  await page.clickLabel('备忘操作 交房租');
  await page.waitForText('备忘操作');
  await page.clickText('删除');
  await page.waitForText('删除这条备忘？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForNoText('交房租');
}
