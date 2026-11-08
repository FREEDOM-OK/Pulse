import { sleep } from './browser.mjs';

/**
 * P6 首页第 1 页：问候语 + 日期、四个框铺满一屏、添加事件、今日计划勾选。
 * 从空数据开始，避免前面场景留下的任务/事件干扰断言。
 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.evaluate('localStorage.clear()');
  await page.reload();

  const now = new Date();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
  await page.waitForText('Hi，用户');
  await page.waitForText(`今日是 ${now.getMonth() + 1}月${now.getDate()}日`);
  await page.waitForText(weekday);

  // 四个框都在，空态正确
  await page.waitForText('今日计划');
  await page.waitForText('今天还没有计划');
  await page.waitForText('添加事件');
  await page.waitForText('去健身');
  await page.waitForText('今天还没练');
  await page.waitForText('游戏');
  await page.waitForText('还没有想玩的游戏');
  await page.waitForText('备忘录');

  // 添加一条重大消费（带小数金额）
  await page.clickLabel('添加事件');
  await page.waitForText('添加重大消费');
  await page.clickText('添加重大消费');
  await page.waitForLabel('事件名称');
  await page.fillByLabel('事件名称', '买键盘');
  await page.fillByLabel('金额', '199.5');
  await page.fillByLabel('备注', '办公用');
  await page.clickLabel('保存事件');
  await page.waitForText('今日 1 条');

  // 再添加一条不带金额的购物
  await page.clickLabel('添加事件');
  await page.clickText('添加重大购物');
  await page.waitForLabel('物品');
  await page.fillByLabel('物品', '洗衣液');
  await page.clickLabel('保存事件');
  await page.waitForText('今日 2 条');

  // 金额写错时给出提示且不保存
  await page.clickLabel('添加事件');
  await page.clickText('添加今日好饭');
  await page.waitForLabel('吃了什么');
  await page.fillByLabel('吃了什么', '牛肉面');
  await page.fillByLabel('金额', '1.2.3');
  await page.clickLabel('保存事件');
  await page.waitForText('金额只能填数字，可以用小数点');
  await page.clickLabel('取消');
  await sleep(300);
  await page.waitForText('今日 2 条');

  // 备忘录：点框弹出卡片，保存后显示在框里，刷新后仍在
  await page.clickLabel('备忘录');
  await page.waitForLabel('备忘录内容');
  await page.fillByLabel('备忘录内容', '记得买猫粮');
  await page.clickLabel('保存备忘');
  await page.waitForText('记得买猫粮');
  await page.reload();
  await page.waitForText('记得买猫粮');

  // 游戏框显示想玩清单：去游戏页加一款，再回首页
  await page.clickText('游戏');
  await page.waitForText('想玩清单是空的');
  await page.clickLabel('添加想玩的游戏');
  await page.waitForText('添加想玩的游戏');
  await page.fill('例如：塞尔达：王国之泪', '塞尔达');
  await page.clickText('保存');
  await page.waitForText('塞尔达');
  await page.clickText('首页');
  await page.waitForText('想玩 1 款');
  await page.waitForText('塞尔达');

  // 在今日计划里加一条任务，回到首页勾选，进度必须立即变化
  await page.clickLabel('打开今日计划');
  await page.waitForText('完成 0/0');
  await page.clickLabel('添加任务');
  await page.waitForText('添加任务');
  await page.fill('例如：写周报', '写周报');
  await page.clickText('保存');
  await page.waitForText('写周报');

  await page.clickText('首页');
  await page.waitForText('完成 0/1');
  await page.clickLabel('任务 写周报');
  await page.waitForText('完成 1/1');
  await page.clickLabel('任务 写周报');
  await page.waitForText('完成 0/1');

  // 刷新后事件条数仍在
  await page.reload();
  await page.waitForText('今日 2 条');

  // 问候语使用个人资料里的名字
  await page.clickText('设置');
  await page.waitForText('数据与偏好');
  await page.clickLabel('账号 用户');
  await page.waitForText('个人资料');
  await page.fillByLabel('用户名', '小明');
  await page.clickLabel('保存个人资料');
  await page.waitForText('数据与偏好');
  await page.clickText('首页');
  await page.waitForText('Hi，小明');
}