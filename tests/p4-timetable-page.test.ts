import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src', 'app');
const T_DIR = path.join(APP_DIR, 'timetable');
const C_DIR = path.join(ROOT, 'src', 'components', 'timetable');

function read(file: string) {
  return fs.readFileSync(file, 'utf8');
}

describe('课表路由结构（PRDv1.2.1 T2）', () => {
  it('课表改为目录路由，四个二级页都存在', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'timetable.tsx'))).toBe(false);
    for (const file of ['_layout.tsx', 'index.tsx', 'course.tsx', 'periods.tsx', 'settings.tsx', 'courses.tsx']) {
      expect(fs.existsSync(path.join(T_DIR, file))).toBe(true);
    }
  });

  it('根 Stack 把 timetable 交给内层布局（不显示原生 header）', () => {
    const layout = read(path.join(APP_DIR, '_layout.tsx'));
    expect(layout).toContain('name="timetable"');
    expect(layout).toContain('headerShown: false');
    expect(layout).toContain('headerShadowVisible: false');
  });

  it('内层布局关闭 header，二级页自己画头部', () => {
    const layout = read(path.join(T_DIR, '_layout.tsx'));
    expect(layout).toContain('headerShown: false');
  });
});

describe('课表主页结构（PRDv1.2.1 T2）', () => {
  const page = read(path.join(T_DIR, 'index.tsx'));

  it('使用自定义头部与周网格', () => {
    expect(page).toContain('<WeekHeader');
    expect(page).toContain('<WeekGrid');
    expect(page).toContain('weekDates(');
  });

  it('不再有旧的工具行、页内课程清单与首次引导', () => {
    expect(page).not.toContain('includeWeekend');
    expect(page).not.toContain('新建课程');
    expect(page).not.toContain('回到今日计划');
    expect(page).not.toContain('OnboardingSheet');
    expect(page).not.toContain('TermSetupSheet');
  });

  it('没有学期时显示空状态而不是弹窗引导', () => {
    expect(page).toContain('先设置学期开始日和节数');
    expect(page).toContain('去设置');
  });

  it('底部显示课程数并可进入管理页', () => {
    expect(page).toContain('共 {courses.length} 门课 · 管理 ›');
  });
});

describe('头部与网格组件（PRDv1.2.1 T2）', () => {
  it('头部有返回、周次、日期与三个图标', () => {
    const header = read(path.join(C_DIR, 'week-header.tsx'));
    expect(header).toContain('第 {week} 周');
    expect(header).toContain('compactDate(mondayDate)');
    expect(header).toContain('添加课程');
    expect(header).toContain('导入课表');
    expect(header).toContain('更多');
    expect(header).toContain('回到本周');
  });

  it('网格支持日期行、可配行高与按周例外', () => {
    const grid = read(path.join(C_DIR, 'week-grid.tsx'));
    expect(grid).toContain('stickyHeaderIndices');
    expect(grid).toContain('rowHeight');
    expect(grid).toContain('exceptions');
    expect(grid).toContain('periodTimes.map');
  });

  it('今日计划的课程行跳转课表且不使用 Href 强制断言', () => {
    const today = read(path.join(APP_DIR, '(tabs)/today.tsx'));
    const list = read(path.join(ROOT, 'src', 'components', 'today', 'today-list.tsx'));
    expect(`${today}${list}`).not.toContain('as Href');
    expect(list).toContain("pathname: '/timetable'");
  });
});