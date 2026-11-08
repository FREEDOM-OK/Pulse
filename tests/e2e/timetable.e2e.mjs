/** P4 课表：首次引导、添加课程、周切换、今日计划注入课程行 */
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function weekdayLabel(date) {
  const index = (date.getDay() + 6) % 7;
  return `周${WEEKDAY_LABELS[index]}`;
}

export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.evaluate('localStorage.clear()');
  await page.goto(`${baseUrl}/timetable`);

  // 首次进入：三步引导
  await page.waitForText('先花一分钟设置课表');
  await page.fill('2026-09-07', '2026-08-31');
  await page.clickText('下一步');
  await page.waitForText('默认 8 节');
  await page.clickText('下一步');
  await page.waitForText('添加第一节课');
  await page.clickText('添加第一节课');

  // 课程表单：名字 + 今天所在星期的时段
  await page.waitForText('课程名');
  await page.fill('例如：高等数学', '高等数学');
  await page.clickLabel(weekdayLabel(new Date()));
  await page.clickText('添加时段', 1);
  await page.waitForText('周');
  await page.clickText('保存');

  // 周网格里出现课程块（默认 1-2 节）
  await page.waitForLabel('高等数学 第 1-2 节');

  // 切到下一周仍在；再回到本周
  await page.clickLabel('下一周');
  await page.waitForLabel('高等数学 第 1-2 节');
  await page.clickText('回到本周');
  await page.waitForText('共 18 周');

  // 今天的课自动出现在今日计划里
  await page.goto(`${baseUrl}/today`);
  await page.waitForText('Today');
  await page.waitForText('高等数学');
  await page.waitForText('第 1-2 节');
}