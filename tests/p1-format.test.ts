import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from '@/lib/format';

describe('P1 事件金额：解析与展示', () => {
  it('空值表示不填金额', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(formatAmount(null)).toBe('');
    expect(formatAmount(undefined)).toBe('');
  });

  it('接受整数与小数，去掉首尾空格', () => {
    expect(parseAmount('28')).toBe(28);
    expect(parseAmount('28.5')).toBe(28.5);
    expect(parseAmount('0.5')).toBe(0.5);
    expect(parseAmount(' 12.50 ')).toBe(12.5);
  });

  it('非法输入返回 null（由表单提示）', () => {
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12.')).toBeNull();
    expect(parseAmount('.5')).toBeNull();
    expect(parseAmount('1,000')).toBeNull();
  });

  it('展示时带 ¥，空金额不显示符号，去掉多余的 0', () => {
    expect(formatAmount(0)).toBe('¥0');
    expect(formatAmount(28)).toBe('¥28');
    expect(formatAmount(28.5)).toBe('¥28.5');
    expect(formatAmount(28.5)).toBe('¥28.5');
    expect(formatAmount(28.56)).toBe('¥28.56');
    expect(formatAmount(28.555)).toBe('¥28.56');
  });
});