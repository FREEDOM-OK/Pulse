import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

function exists(relative: string) {
  return fs.existsSync(path.join(ROOT, 'src', relative));
}

describe('S7 M3 底栏第三格 ↔ 二级页（PRD_module 第 8 节）', () => {
  it('第三格是真正的路由 middle，三选一由设置决定', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).toContain('getMiddleTab()');
    expect(layout).toContain('<AppTabBar {...props} middle={middle} />');
    expect(exists('app/(tabs)/middle.tsx')).toBe(true);
  });

  it('middle 页按设置渲染健身/日历，课表保持独立全屏页', () => {
    const page = read('app/(tabs)/middle.tsx');
    expect(page).toContain('<FitnessScreen mode="tab" />');
    expect(page).toContain('<CalendarScreen mode="tab" />');
    expect(page).toContain('<Redirect href="/timetable" />');
    // 课表不抽 body 进底栏页：middle 里不应直接渲染课表组件。
    expect(page).not.toContain('TimetableGrid');
  });

  it('健身与日历各有一个二级页，用 page 模式显示圆形返回', () => {
    expect(read('app/fitness.tsx')).toContain('<FitnessScreen mode="page" />');
    expect(read('app/calendar.tsx')).toContain('<CalendarScreen mode="page"');
    expect(read('components/nav/sub-page-header.tsx')).toContain('accessibilityLabel="返回"');
    expect(read('components/nav/sub-page-header.tsx')).toContain('borderRadius: 18');
  });

  it('二级页顶部安全区由页面自己处理，根 Stack 不再画原生顶栏', () => {
    const root = read('app/_layout.tsx');
    expect(root).toContain('<Stack.Screen name="calendar" options={{ headerShown: false }} />');
    expect(root).toContain('<Stack.Screen name="fitness" options={{ headerShown: false }} />');
  });

  it('底栏第三格选课表时仍然 push 全屏课表页，其他时按路由名判断选中', () => {
    const bar = read('components/nav/app-tab-bar.tsx');
    expect(bar).toContain("tab.name === 'middle' && middle === 'timetable'");
    expect(bar).toContain("router.push('/timetable')");
    // 不再有把 'timetable' 当成 Tab 路由名的旧判断。
    expect(bar).not.toContain("if (tab.name === 'timetable')");
  });

  it('首页 Dash 卡片：第三格是自己就切 Tab，否则开二级页', () => {
    const page = read('app/(tabs)/index.tsx');
    expect(page).toContain("middle === 'fitness' ? router.navigate('/middle') : router.push('/fitness')");
    expect(page).toContain(
      "middle === 'calendar' ? router.navigate('/middle') : router.push('/calendar')"
    );
    expect(page).toContain("timetable: () => router.push('/timetable')");
  });

  it('第三个标签支持日历', () => {
    const types = read('db/types.ts');
    expect(types).toContain("export type MiddleTab = 'fitness' | 'timetable' | 'calendar';");
    expect(types).toContain("calendar: '日历'");
    expect(read('app/(tabs)/settings.tsx')).toContain('底栏中间放健身、课表还是日历');
  });
});