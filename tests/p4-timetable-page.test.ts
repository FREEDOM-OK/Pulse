import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src', 'app');

function readApp(relative: string) {
  return fs.readFileSync(path.join(APP_DIR, relative), 'utf8');
}

describe('课表页结构（PRDv1.2 P4）', () => {
  it('存在 /timetable 二级页并注册到根 Stack', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'timetable.tsx'))).toBe(true);
    const layout = readApp('_layout.tsx');
    expect(layout).toContain('name="timetable"');
    expect(layout).toContain("title: '课表'");
  });

  it('课表页使用周网格与课程表单', () => {
    const page = readApp('timetable.tsx');
    expect(page).toContain('<WeekGrid');
    expect(page).toContain('<CourseForm');
    expect(page).toContain('includeWeekend');
    expect(page).toContain('回到本周');
  });

  it('首次引导包含三步：学期开始日 → 节次时间 → 第一节课', () => {
    const page = readApp('timetable.tsx');
    const steps = page.slice(page.indexOf('const STEPS'));
    expect(steps).toContain('学期开始日');
    expect(steps).toContain('节次时间');
    expect(steps).toContain('第一节课');
  });

  it('今日计划的课程行跳转课表且不使用 Href 强制断言', () => {
    const today = readApp('(tabs)/today.tsx');
    const list = fs.readFileSync(
      path.join(ROOT, 'src', 'components', 'today', 'today-list.tsx'),
      'utf8'
    );
    expect(today).not.toContain('as Href');
    expect(`${today}${list}`).not.toContain('as Href');
    expect(list).toContain("pathname: '/timetable'");
  });
});