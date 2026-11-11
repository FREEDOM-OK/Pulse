import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

/**
 * M6 效果清单里本轮落地的 E1：全局按压回弹 96% + 弹簧。
 * 纯视觉，按 AGENTS.md 手势/动效不写 E2E，这里锁住参数与减弱动效的兜底。
 */
describe('S9 M6 按压回弹（PRD_module 第 10 节 E1）', () => {
  const ripple = read('components/ui/ripple-pressable.tsx');

  it('按下缩到 96%，松手用弹簧回 1', () => {
    expect(ripple).toContain('const PRESS_SCALE = 0.96;');
    expect(ripple).toContain('toValue: PRESS_SCALE');
    expect(ripple).toContain('Animated.spring(scale, {');
    expect(ripple).toContain('bounciness: 6');
    expect(ripple).toContain('{ transform: [{ scale }] }');
  });

  it('开启减弱动效时不缩放也不画波纹', () => {
    expect(ripple).toContain('if (!reduced) {');
    expect(ripple).toContain('useReducedMotion()');
  });

  it('内容层铺满外层，卡片与按钮两种尺寸都成立', () => {
    expect(ripple).toContain('styles.hit');
    expect(ripple).toContain('flexGrow: 1,');
    expect(ripple).toContain('flexShrink: 1,');
  });
});