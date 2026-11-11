import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function readSource(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

describe('M2 底部抽屉（PLAN_module_v1.2.2 第 6 节）', () => {
  const sheet = readSource('components/ui/bottom-sheet.tsx');
  /** 注释里会提到 animationType="slide"（解释为什么弃用），断言前先剥掉注释行。 */
  const code = sheet
    .split('\n')
    .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('/*'))
    .join('\n');

  it('遮罩与抽屉分开播：不再用 Modal 的 slide 动画', () => {
    expect(code).not.toContain('animationType="slide"');
    expect(code).toContain('animationType="none"');
    expect(sheet).toContain('backdropOpacity');
    expect(sheet).toContain('ENTER_MS = 220');
    expect(sheet).toContain('BACKDROP_MS = 180');
  });

  it('提供两档高度 half / full', () => {
    expect(sheet).toContain("'half' | 'full'");
    expect(sheet).toContain('half: 0.5');
    expect(sheet).toContain('full: 0.92');
  });

  it('关闭时先播动画再卸载（rendered 状态）', () => {
    expect(sheet).toContain('setRendered');
    expect(sheet).toContain('if (finished && !visible) setRendered(false)');
    expect(sheet).toContain('if (!rendered) return null');
  });

  it('个人资料页的生日抽屉改用半屏档', () => {
    expect(readSource('app/profile.tsx')).toContain('size="half"');
  });
});