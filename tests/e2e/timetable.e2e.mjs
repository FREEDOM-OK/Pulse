/**
 * P4 课表：学期设置 → 添加课程（整页表单 + 滚轮选时段）→ 回到网格 →
 * 点课程块打开详情抽屉 → 周次滚轮切周并回到本周。
 *
 * 说明：Web 端数据库存在 localStorage，场景不假设开局是空库，
 * 课程名带时间戳，避免与历史数据重名。
 */
export async function run(page, baseUrl) {
  const courseName = `高等数学${String(Date.now()).slice(-4)}`;

  await page.goto(`${baseUrl}/timetable/settings`);
  await page.evaluate('localStorage.clear()');
  await page.reload();

  await page.waitForText('课表设置');
  await page.clickLabelContaining('学期开始日');
  await page.waitForLabel('学期开始日');
  await page.fillByLabel('学期开始日', '2026-09-07');
  await page.clickText('保存');
  await new Promise((resolve) => setTimeout(resolve, 400));

  await page.goto(`${baseUrl}/timetable`);
  await page.waitForText('第');
  await page.waitForLabel('添加课程');

  // 添加课程：整页表单
  await page.clickLabel('添加课程');
  await page.waitForText('添加课程');
  await page.fillByLabel('课程名称', courseName);
  await page.fillByLabel('地点', 'A101');
  await page.clickLabel('添加时段');
  await page.waitForText('选择星期与节次');
  await page.clickLabel('确定时段');
  await new Promise((resolve) => setTimeout(resolve, 300));
  await page.clickLabel('保存');
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 若与历史课程冲突，选择仍然保存
  if (await page.has('时间冲突')) {
    await page.clickText('仍然保存');
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  await page.waitForText(courseName);
  await page.waitForLabel(`${courseName} 第 1-2 节`);

  // 点课程块 → 详情抽屉（备注可直接写）
  await page.clickLabel(`${courseName} 第 1-2 节`);
  await page.waitForText('备注');
  await page.waitForLabel('编辑课程');
  await page.clickLabel('关闭抽屉');
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 周次滚轮切到第 2 周，再回到本周
  await page.clickLabelContaining('切换周次，当前第');
  await page.waitForText('选择周次');
  await page.clickText('第 2 周');
  await page.clickText('保存');
  await new Promise((resolve) => setTimeout(resolve, 400));
  await page.clickLabel('回到本周');
  await new Promise((resolve) => setTimeout(resolve, 400));
  await page.waitForText(courseName);
}