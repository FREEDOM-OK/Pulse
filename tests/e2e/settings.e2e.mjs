import { sleep } from './browser.mjs';

const THEME_LABELS = ['跟随系统', '浅色', '深色'];

async function checkedTheme(page) {
  const found = await page.evaluate(`(() => {
    const labels = ${JSON.stringify(THEME_LABELS)};
    for (const label of labels) {
      if (document.body.innerText.includes('✓ ' + label)) return label;
    }
    return null;
  })()`);
  return found;
}

/** P8 设置：主题切换与持久化、导出备份、清空数据（含自动备份） */
export async function run(page, baseUrl) {
  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickText('设置');
  await page.waitForText('数据与偏好');

  // 默认跟随系统
  if ((await checkedTheme(page)) !== '跟随系统') {
    throw new Error(`默认主题应为跟随系统，实际：${await checkedTheme(page)}`);
  }

  // 切深色并验证
  await page.clickText('深色');
  await sleep(400);
  if ((await checkedTheme(page)) !== '深色') {
    throw new Error('切换深色失败');
  }

  // 刷新后仍是深色
  await page.reload();
  await page.clickText('设置');
  if ((await checkedTheme(page)) !== '深色') {
    throw new Error('刷新后深色主题没有保持');
  }

  // 导出备份
  await page.clickLabel('备份数据');
  await page.waitForText('已导出：生活App备份-');

  // 清空数据
  await page.clickLabel('清空所有数据');
  await page.waitForText('清空所有数据？');
  await page.clickText('确认清空');
  await page.waitForText('已清空所有数据');
  if ((await checkedTheme(page)) !== '跟随系统') {
    throw new Error('清空数据后主题应恢复为跟随系统');
  }

  // 首页回到空状态
  await page.clickText('首页');
  await page.waitForText('今天还没有计划');
  await page.waitForText('还没有备忘');
}
