import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { copyCourseName } from '@/lib/course-copy';
import { validateCourseDraft, weeksFromRange, weeksToRange } from '@/lib/course-form';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

describe('S5 课表补齐：课程表单、详情抽屉与三种底色', () => {
  it('周次文本与数组互转', () => {
    expect(weeksToRange([1, 2, 3, 5])).toBe('1-3,5');
    expect(weeksToRange([1, 3, 5, 7])).toBe('单周 1-7');
    expect(weeksToRange([2, 4, 6])).toBe('双周 2-6');
    expect(weeksToRange([])).toBe('');
    expect(weeksFromRange('1-3,5', 18)).toEqual([1, 2, 3, 5]);
    expect(weeksFromRange('单周', 6)).toEqual([1, 3, 5]);
    expect(weeksFromRange('', 6)).toEqual([]);
    expect(weeksFromRange('1-99', 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('课程草稿校验覆盖名称、时段与节次范围', () => {
    const base = { name: '高数', teacher: '', room: '', color: '#4C8DF6', background: 'plain', note: '' };
    const slot = { weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [] };
    expect(validateCourseDraft({ ...base, slots: [slot] }, 11)).toBeNull();
    expect(validateCourseDraft({ ...base, name: '  ', slots: [slot] }, 11)).toBe('请填写课程名称');
    expect(validateCourseDraft({ ...base, slots: [] }, 11)).toBe('至少添加一个上课时段');
    expect(validateCourseDraft({ ...base, slots: [{ ...slot, endPeriod: 12 }] }, 11)).toBe(
      '节次需在 1 – 11 之间'
    );
    expect(validateCourseDraft({ ...base, slots: [{ ...slot, startPeriod: 4, endPeriod: 2 }] }, 11)).toBe(
      '开始节次不能晚于结束节次'
    );
  });

  it('复制课程命名为「原名 副本」且不会叠加', () => {
    expect(copyCourseName('高等数学')).toBe('高等数学 副本');
    expect(copyCourseName('高等数学 副本')).toBe('高等数学 副本');
    expect(copyCourseName('   ')).toBe('课程 副本');
  });

  it('课程页是整页表单：保存胶囊、三种底色、备注与时段滚轮', () => {
    const page = read('app/timetable/course.tsx');
    expect(page).toContain('<SubPageHeader');
    expect(page).toContain("actionLabel={saving ? '保存中' : '保存'}");
    expect(page).toContain('COURSE_BACKGROUNDS.map');
    expect(page).toContain('accessibilityLabel="课程备注"');
    expect(page).toContain('accessibilityLabel="添加时段"');
    expect(page).toContain('<WheelPicker');
    expect(page).toContain('findSlotConflict');
    expect(page).toContain('仍要添加');
    expect(page).not.toContain('ModalSheet');
  });

  it('课程详情抽屉：备注内联保存、编辑大于删除、仅本周/所有周', () => {
    const sheet = read('components/timetable/course-detail-sheet.tsx');
    expect(sheet).toContain('onBlur={() => onNoteSave(note.trim())}');
    expect(sheet).toContain('accessibilityLabel="编辑课程"');
    expect(sheet).toContain('accessibilityLabel="复制课程"');
    expect(sheet).toContain('仅本周');
    expect(sheet).toContain('所有周');
    expect(sheet).toContain('恢复本周');
    // 编辑按钮比删除更宽（flex 2 对 88 宽）。
    expect(sheet).toContain('flex: 2');
  });

  it('周网格支持纯色 / 网格 / 斑马纹三种底色', () => {
    const grid = read('components/timetable/week-grid.tsx');
    expect(grid).toContain('CourseBlockPattern');
    expect(grid).toContain("background === 'grid'");
    expect(grid).toContain('patternLayer');
    expect(grid).toContain('stripe');
  });

  it('课表主页点课程打开详情抽屉而不是直接跳编辑页', () => {
    const page = read('app/timetable/index.tsx');
    expect(page).toContain('<CourseDetailSheet');
    expect(page).toContain('onPressCourse={(courseId) => setDetailId(courseId)}');
    expect(page).toContain('addCourseException');
    expect(page).toContain('removeCourseException');
    expect(page).toContain('copyCourseName');
  });
});