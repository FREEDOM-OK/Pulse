/** P8b 个人资料：点击设置页账号进入资料页，改名/性别/生日后保存并持久化。 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.evaluate('localStorage.clear()');
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickLabel('我的');
  await page.waitForText('数据与偏好');

  await page.waitForLabel('账号 用户');
  await page.clickLabel('账号 用户');
  await page.waitForText('个人资料');

  await page.fillByLabel('用户名', '小明');
  await page.clickLabel('女');
  await page.fillByLabel('生日年份', '2000');
  await page.fillByLabel('生日月份', '2');
  await page.fillByLabel('生日日期', '29');
  await page.clickLabel('保存个人资料');

  await page.waitForText('数据与偏好');
  await page.waitForLabel('账号 小明');
  if (!(await page.has('小明'))) {
    throw new Error('保存后设置页没有显示新用户名');
  }

  // 刷新后仍然保留
  await page.reload();
  await page.clickLabel('我的');
  await page.waitForLabel('账号 小明');
  await page.clickLabel('账号 小明');
  await page.waitForText('个人资料');
  const birthday = await page.evaluate(`(() => ({
    year: document.querySelector('[aria-label="生日年份"]')?.value ?? null,
    month: document.querySelector('[aria-label="生日月份"]')?.value ?? null,
    day: document.querySelector('[aria-label="生日日期"]')?.value ?? null,
  }))()`);
  if (birthday.year !== '2000' || Number(birthday.month) !== 2 || Number(birthday.day) !== 29) {
    throw new Error(`生日没有持久化：${JSON.stringify(birthday)}`);
  }

  // 回到首页再进设置，清空数据后资料回到默认值
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickLabel('我的');
  await page.waitForText('数据与偏好');
  await page.clickLabel('清空所有数据');
  await page.waitForText('清空所有数据？');
  await page.clickText('确认清空');
  await page.waitForText('已清空所有数据');
  await page.waitForLabel('账号 用户');
}