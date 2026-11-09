import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const T_DIR = path.join(ROOT, 'src', 'app', 'timetable');
const C_DIR = path.join(ROOT, 'src', 'components', 'timetable');

function read(file: string) {
  return fs.readFileSync(file, 'utf8');
}

describe('课表三个二级页（PRDv1.2.1 T3）', () => {
  it('「…」抽屉有三个入口并跳独立页面', () => {
    const sheet = read(path.join(C_DIR, 'overflow-sheet.tsx'));
    expect(sheet).toContain('上课时间');
    expect(sheet).toContain('课表设置');
    expect(sheet).toContain('已填课程');
    expect(read(path.join(T_DIR, 'index.tsx'))).toContain('<OverflowSheet');
  });

  it('上课时间页可逐节改开始与结束并校验', () => {
    const page = read(path.join(T_DIR, 'periods.tsx'));
    expect(page).toContain('getPeriodTimes');
    expect(page).toContain('setPeriodTimes');
    expect(page).toContain('findPeriodOverlap');
    expect(page).toContain('isValidTime');
    expect(page).toContain('时间重叠');
  });

  it('课表设置页是行式六项，格子高度用弹窗修改', () => {
    const page = read(path.join(T_DIR, 'settings.tsx'));
    expect(page).toContain('学期开始日');
    expect(page).toContain('总周数');
    expect(page).toContain('节数');
    expect(page).toContain('显示周六周日');
    expect(page).toContain('课程格子高度');
    expect(page).toContain('导入课表');
    expect(page).toContain('<ValueDialog');
    expect(page).toContain('即将支持');
  });

  it('已填课程页支持空状态与进入编辑', () => {
    const page = read(path.join(T_DIR, 'courses.tsx'));
    expect(page).toContain('还没有课程');
    expect(page).toContain('formatWeeksRange');
    expect(page).toContain("pathname: '/timetable/course'");
  });

  it('设置行组件展示值、占位与 ›', () => {
    const row = read(path.join(C_DIR, 'settings-row.tsx'));
    expect(row).toContain("placeholder = '选填'");
    expect(row).toContain('›');
  });
});