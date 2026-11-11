import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { motionDuration } from '@/lib/motion';

const ROOT = path.resolve(__dirname, '..');

function readSource(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

describe('S1 设计令牌（PRDv1.2.2 第 5 节）', () => {
  const theme = readSource('constants/theme.ts');

  it('间距一律 8 的倍数', () => {
    expect(theme).toContain('export const Space = {\n  one: 8,\n  two: 16,\n  three: 24,\n  four: 32,\n  five: 48,\n} as const;');
  });

  it('字号行高按 1.5 倍', () => {
    const sizes = [28, 22, 16, 14, 12, 11];
    for (const size of sizes) {
      expect(theme).toContain(`fontSize: ${size}, lineHeight: ${Math.round(size * 1.5)}`);
    }
    expect(theme).toContain("fontWeight: '800'");
    expect(theme).toContain("fontWeight: '700'");
  });

  it('动效时长固定四档', () => {
    expect(theme).toContain('export const Motion = {\n  enter: 250,\n  move: 300,\n  check: 200,\n  ripple: 200,\n} as const;');
  });

  it('Dash 卡片为 264×427 竖卡（黄金 1:1.618）', () => {
    expect(theme).toContain('width: 264');
    // v1.2.2 起高度不再写死，统一由宽 × 1.618 推出来。
    expect(theme).not.toContain('height: 163');
    expect(theme).toContain('DASH_CARD_RATIO = 1.618');
    // theme.ts 会 import react-native，单测里不能直接 import，按源码里的比例算一遍。
    const ratio = Number(/DASH_CARD_RATIO = ([\d.]+)/.exec(theme)?.[1] ?? 0);
    expect(Math.round(264 * ratio)).toBe(427);
  });

  it('减弱动效时把时长压成 0', () => {
    expect(motionDuration(250, false)).toBe(250);
    expect(motionDuration(250, true)).toBe(0);
  });
});

describe('S1 通用组件', () => {
  it('RipplePressable 从触点扩散并读减弱动效', () => {
    const source = readSource('components/ui/ripple-pressable.tsx');
    expect(source).toContain('locationX');
    expect(source).toContain('locationY');
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('Motion.ripple');
  });

  it('StaggeredAppear 逐条错开且只播一次', () => {
    const source = readSource('components/ui/staggered-appear.tsx');
    expect(source).toContain('Math.min(index, 6) * 40');
    expect(source).toContain('Motion.enter');
    expect(source).toContain('useReducedMotion');
  });

  it('CheckMark 默认 22 方形框，可切圆形，勾选动画 200ms', () => {
    const source = readSource('components/ui/check-mark.tsx');
    expect(source).toContain('size = 22');
    expect(source).toContain("shape = 'square'");
    expect(source).toContain("borderRadius: shape === 'circle' ? size / 2 : (radius ?? 7)");
    expect(source).toContain('Motion.check');
    expect(source).toContain('accessibilityRole="checkbox"');
  });

  it('Breadcrumb 最后一项为当前页不可点', () => {
    const source = readSource('components/ui/breadcrumb.tsx');
    expect(source).toContain('const last = index === trail.length - 1');
    expect(source).toContain('last || !item.onPress');
    expect(source).toContain('›');
  });

  it('减弱动效 hook 订阅系统设置', () => {
    const source = readSource('hooks/use-reduced-motion.ts');
    expect(source).toContain('isReduceMotionEnabled');
    expect(source).toContain('prefers-reduced-motion');
    expect(source).toContain('useSyncExternalStore');
  });
});