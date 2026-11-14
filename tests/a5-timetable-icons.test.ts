import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const DRAWER = 'src/components/timetable/course-detail-drawer.tsx';
const SCREEN = 'src/components/timetable/timetable-screen.tsx';
const COURSE_FORM = 'src/app/timetable/course.tsx';
const SHEET = 'src/components/ui/bottom-sheet.tsx';

const EMOJI = ['🎨', '⭐', '📅', '⏰', '📝', '📍', '👤', '📋', '📄', '🗑️'];

describe('课表：线性图标与复制 Toast', () => {
  it('课程表单不再有彩色 Emoji，改用 SymbolView 线性图标', () => {
    const source = read(COURSE_FORM);
    expect(source).toContain("from 'expo-symbols'");
    expect(source).toContain('<SymbolView');
    for (const emoji of EMOJI) expect(source).not.toContain(emoji);
    expect(source).not.toContain('rowEmoji');
  });

  it('详情抽屉的图标与 Emoji 已全部替换', () => {
    const source = read(DRAWER);
    expect(source).toContain('<SymbolView');
    for (const emoji of EMOJI) expect(source).not.toContain(emoji);
  });

  it('BottomSheet 支持 overlay 浮层，且抽屉把 Toast 挂在 overlay 上', () => {
    expect(read(SHEET)).toContain('overlay?: React.ReactNode');
    const drawer = read(DRAWER);
    expect(drawer).toContain('overlay={');
    expect(drawer).toContain('writeClipboard(copyText)');
  });

  it('复制不再关闭抽屉、也不再克隆课程', () => {
    const screen = read(SCREEN);
    expect(screen).not.toContain('duplicateCourse');
    expect(screen).not.toContain('onCopy=');
  });
});