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
  await page.clickLabelContaining('生日');
  await page.waitForText('生日');
  await page.clickLabel('选择 2004 年');
  await page.clickLabel('选择 2 月');
  await page.clickLabel('选择 29 日');
  await page.clickText('确定');
  await page.waitForLabel('生日 2004 年 02 月 29 日');
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
  await page.waitForLabel('生日 2004 年 02 月 29 日');

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