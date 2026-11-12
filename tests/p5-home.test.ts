import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import { countRecordsInRange } from '@/db/repositories/calendar';
import { createTask } from '@/db/repositories/tasks';
import { createMemo } from '@/db/repositories/memos';
import { createEvent } from '@/db/repositories/events';
import { addTrainingItem, completeSet } from '@/db/repositories/training';

const ROOT = path.resolve(__dirname, '..');

function readApp(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', 'app', relative), 'utf8');
}

function readSrc(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

afterEach(() => {
  resetDriverForTests();
});

describe('首页结构（PRDv1.2 P5）', () => {
  it('首页包含问候、日期、Search、Dash 卡片与 Tasks 五段', () => {
    const page = readApp('(tabs)/index.tsx');
    expect(page).toContain('Hey, {name}!');
    expect(page).toContain('今天是 ');
    expect(page).toContain('styles.searchBar');
    expect(page).toContain('height: 50');
    expect(page).toContain('contentContainerStyle={{ paddingBottom: 120 }}');
    expect(page).toContain('<DashCarousel');
    expect(page).toContain('Dash');
    expect(page).toContain('Tasks');
    expect(page).not.toContain('onlyTasksAndCourses');
    expect(page).toContain('checkSize={20}');
    expect(page).toContain('checkRadius={6}');
    expect(page).toContain('courseVariant="home"');
    expect(page).not.toContain('RefreshControl');
    expect(page).toContain('bounces={false}');
    expect(page).toContain('pullDistance');
    expect(page).toContain('Math.min(Math.max(gesture.dy * 0.5, 0), 120)');
    expect(page).toContain('damping: 18, stiffness: 180');
    expect(page).toContain("userSelect: 'none'");
    expect(page).toContain("transformOrigin: 'left center'");
    expect(page).toContain('style={contentAnimatedStyle}');
    expect(page).toContain('rowSpacing={16}');
    expect(page).toContain('<SearchOverlay');
    expect(page).toContain('searchOpen');
    expect(page).toContain('setSearchOpen(true)');
  });

  it('沉浸搜索结果可带日期跳到对应详情', () => {
    const page = readApp('(tabs)/index.tsx');
    expect(page).toContain("from '@/components/home/search-overlay'");
    expect(page).toContain('pathname: \'/fitness\', params: { date: result.date }');
    expect(page).toContain("pathname: '/day/[date]'");

    const overlay = readSrc('components/home/search-overlay.tsx');
    expect(overlay).toContain('searchRecords(trimmed)');
    expect(overlay).toContain('recordSearchQuery(trimmed)');
    expect(overlay).toContain('onSubmitEditing');
    expect(overlay).toContain('Keyboard.dismiss()');
    expect(overlay).toContain('listSearchHistory()');
    expect(overlay).toContain('清空历史');
    expect(overlay).toContain('CLOSE_DURATION = 200');

    const results = readSrc('components/home/search-results.tsx');
    expect(results).toContain('height: 72');
    expect(results).toContain('borderRadius: 16');
    expect(results).toContain('formatMonthDay(item.date)');
    expect(results).toContain('task: { label: \'计划\'');
    expect(results).toContain('memo: { label: \'备忘\'');
    expect(results).toContain('fitness: { label: \'健身\'');
    expect(readSrc('app/day/[date].tsx')).toContain('<DateStrip value={date} onChange={setDate} />');

    expect(fs.existsSync(path.join(ROOT, 'src', 'app', 'day', '[date].tsx'))).toBe(true);
    expect(readApp('_layout.tsx')).toContain('name="day/[date]"');
  });

  it('首页勾选任务后广播数据版本，计划页与首页保持同步', () => {
    const list = readSrc('components/today/today-list.tsx');
    expect(list).toMatch(/await toggleTask\(task\.id\);[\s\S]{0,300}bumpDataVersion\(\);/);
  });

  it('新建菜单与表单按钮使用固定高度，不会被 flex 拉成长条', () => {
    const menu = readSrc('components/ui/action-menu.tsx');
    expect(menu).toMatch(/item:\s*{[^}]*height: 56/s);
    expect(menu).toContain('justifyContent: \'flex-start\'');

    const button = readSrc('components/ui/app-button.tsx');
    expect(button).toContain('height: 38');
    expect(button).toContain('paddingHorizontal: 16');
    expect(button).toContain('paddingVertical: 8');
    expect(button).toContain('flexGrow: 0');

    const modal = readSrc('components/ui/modal-sheet.tsx');
    expect(modal).toMatch(/actionsRow:\s*{[^}]*flexDirection: 'row'[^}]*alignItems: 'center'/s);
    expect(modal).toContain("flexWrap: 'nowrap'");
  });

  it('首页不再有上下翻页、内嵌日历与悬浮 FAB', () => {
    const page = readApp('(tabs)/index.tsx');
    // M5 起首页允许用 PanResponder 做「安卓下拉拉伸」；捕获阶段只接管顶部向下手势。
    expect(page).toContain('onMoveShouldSetPanResponderCapture');
    expect(page).toContain('gesture.dy > 6');
    expect(page).not.toContain('pagingEnabled');
    expect(page).not.toContain('BackHandler');
    expect(page).not.toContain('CalendarPanel');
    expect(page).not.toContain('FAB');
    expect(fs.existsSync(path.join(ROOT, 'src', 'lib', 'home-pager.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'src', 'components', 'home', 'mini-calendar.tsx'))).toBe(
      false
    );
  });

  it('首页与今日计划复用同一个混合列表组件', () => {
    expect(readApp('(tabs)/index.tsx')).toContain("from '@/components/today/today-list'");
    expect(readApp('(tabs)/today.tsx')).toContain("from '@/components/today/today-list'");
  });

  it('首页课程/待办行与添加任务弹窗使用新规格', () => {
    const list = readSrc('components/today/today-list.tsx');
    expect(list).not.toContain("item.kind !== 'memo'");
    expect(list).toContain('[...sorted.active, ...sorted.completed]');
    expect(list).not.toContain('已完成');

    const course = readSrc('components/today/course-row.tsx');
    expect(course).toContain('home && styles.dotHome');
    expect(course).toMatch(/dotHome:\s*{[^}]*width: 8[^}]*height: 8[^}]*borderRadius: 4/s);
    expect(course).toContain('dotColor ?? course.color');
    expect(course).toContain('course.room');
    expect(course).toContain("{!home ? (");

    expect(list).toContain('getTimetableSettings');
    expect(list).toContain('softenColor(course.color, courseSaturation)');

    const task = readSrc('components/today/task-row.tsx');
    expect(task).toContain('checkSize = 22');
    expect(task).toContain('radius={checkRadius}');
    expect(readSrc('components/ui/check-mark.tsx')).toContain('radius ?? 7');

    const modal = readSrc('components/ui/modal-sheet.tsx');
    expect(modal).toContain('KeyboardAvoidingView');
    expect(modal).toContain("maxHeight: '100%'");
    expect(modal).toContain('flexShrink: 1');
  });
});

describe('首页卡片数据', () => {
  it('countRecordsInRange 统计任务/备忘/事件/健身组', async () => {
    await createTestContext();
    await createTask({ date: '2026-11-08', title: '写周报' });
    await createMemo({ date: '2026-11-08', content: '买牛奶' });
    await createEvent({ date: '2026-11-08', type: 'expense', title: '买键盘', amount: 399 });
    const itemId = await addTrainingItem({
      date: '2026-11-08',
      exerciseId: 1,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    await completeSet(itemId);

    expect(await countRecordsInRange('2026-11-08', '2026-11-08')).toBe(4);
    expect(await countRecordsInRange('2026-11-07', '2026-11-07')).toBe(0);
    expect(await countRecordsInRange('2026-11-01', '2026-11-30')).toBe(4);
  });
});