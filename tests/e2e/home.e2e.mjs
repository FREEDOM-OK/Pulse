import { sleep } from './browser.mjs';

/**
 * P6 首页：问候语 + 日期、万事卡横滑、全局新建、今日任务勾选、改用户名。
 * 从空数据开始，避免前面场景留下的任务/事件干扰断言。
 */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.evaluate('localStorage.clear()');
  await page.reload();

  const now = new Date();
  const weekday = '日一二三四五六'[now.getDay()];
  await page.waitForText('Hey，用户！');
  await page.waitForText(`今天是 ${now.getMonth() + 1}月${now.getDate()}日`);
  await page.waitForText(`星期${weekday}`);

  // Dash 卡片与今日任务区
  await page.waitForText('Dash');
  await page.waitForText('去健身');
  await page.waitForText('今天还没练');
  await page.waitForText('去游戏');
  await page.waitForText('想玩清单还是空的');
  await page.waitForText('看日历');
  await page.waitForText('本月 0 条');
  await page.waitForText('Tasks');
  await page.waitForText('今天还没有安排');
  // 课表卡默认关闭
  if (await page.has('看课表')) throw new Error('课表卡默认应为关闭状态');

  // 凸起 + → 记重大消费，首页日历卡立刻更新
  await page.clickLabel('新建');
  await page.waitForText('记重大消费');
  await page.clickText('记重大消费');
  await page.waitForLabel('事件名称');
  await page.fillByLabel('事件名称', '买键盘');
  await page.fillByLabel('金额', '199.5');
  await page.fillByLabel('备注', '办公用');
  await page.clickLabel('保存事件');
  await page.waitForText('本月 1 条');

  // 金额写错时不保存并给提示
  await page.clickLabel('新建');
  await page.clickText('记今日好饭');
  await page.waitForLabel('吃了什么');
  await page.fillByLabel('吃了什么', '牛肉面');
  await page.fillByLabel('金额', '1.2.3');
  await page.clickLabel('保存事件');
  await page.waitForText('金额只能填数字，可以用小数点');
  await page.clickLabel('取消');
  await sleep(300);
  await page.waitForText('本月 1 条');

  // 游戏卡：去游戏页加一款想玩的，回首页卡片副文案变化
  await page.goto(`${baseUrl}/games`);
  await page.waitForText('想玩清单是空的');
  await page.clickLabel('添加想玩的游戏');
  await page.waitForText('添加想玩的游戏');
  await page.fill('例如：塞尔达：王国之泪', '塞尔达');
  await page.clickText('保存');
  await page.waitForText('塞尔达');
  await page.goto(baseUrl);
  await page.waitForText('想玩 1 款');

  // 计划页加一条任务，回首页勾选，进度立即变化
  await page.clickLabel('计划');
  await page.waitForText('Today');
  await page.clickLabel('新建任务或备忘');
  await page.clickText('新建任务');
  await page.waitForText('添加任务');
  await page.fill('例如：写周报', '写周报');
  await page.clickText('保存');
  await page.waitForText('写周报');

  await page.clickLabel('首页');
  await page.waitForText('完成 0/1');
  await page.clickLabel('标记为完成');
  await page.waitForText('完成 1/1');
  await page.clickText('已完成 1 项');
  await page.clickLabel('标记为未完成');
  await page.waitForText('完成 0/1');

  // 刷新后事件仍在（日历卡统计含事件与任务：1 事件 + 1 任务）
  await page.reload();
  await page.waitForText('本月 2 条');
  await page.waitForText('写周报');

  // 问候语使用个人资料里的名字
  await page.clickLabel('我的');
  await page.waitForText('数据与偏好');
  await page.clickLabel('账号 用户');
  await page.waitForText('个人资料');
  await page.fillByLabel('用户名', '小明');
  await page.clickLabel('保存个人资料');
  await page.waitForText('数据与偏好');
  await page.clickLabel('首页');
  await page.waitForText('Hey，小明！');
}