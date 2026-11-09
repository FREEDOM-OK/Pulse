/** P6 首页卡片管理：入口、开关数量、恢复默认 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('Dash');
  await page.clickLabel('我的');
  await page.waitForText('数据与偏好');
  await page.clickLabel('首页卡片');
  await page.waitForText('首页显示');

  // 四张卡都在，开关四个
  for (const title of ['健身', '游戏', '日历回顾', '课表']) {
    await page.waitForText(title);
  }
  const switches = await page.evaluate(`document.querySelectorAll('[role="switch"]').length`);
  if (switches < 4) throw new Error(`卡片开关数量不对：${switches}`);

  // 恢复默认后首页仍是三张（课表默认关闭）
  await page.clickText('恢复默认');
  await page.goto(baseUrl);
  await page.waitForText('去健身');
  await page.waitForText('去游戏');
  await page.waitForText('看日历');
  if (await page.has('看课表')) throw new Error('课表卡默认不应显示');
}