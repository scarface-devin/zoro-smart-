import { describe, it, expect } from 'vitest';
import { fmt } from '../lib/format';

describe('fmt.compact', () => {
  it('formats a plain number', () => {
    expect(fmt.compact(500)).toBe('500');
  });

  it('formats thousands as K', () => {
    const result = fmt.compact(12500);
    expect(result).toContain('K');
  });

  it('formats millions as M', () => {
    const result = fmt.compact(1_200_000);
    expect(result).toContain('M');
  });

  it('returns em-dash for NaN', () => {
    expect(fmt.compact(NaN)).toBe('—');
  });

  it('returns em-dash for Infinity', () => {
    expect(fmt.compact(Infinity)).toBe('—');
  });

  it('accepts bigint', () => {
    const result = fmt.compact(1_000_000n);
    expect(result).toContain('M');
  });

  it('accepts string', () => {
    const result = fmt.compact('500000');
    expect(result).toContain('K');
  });
});

describe('fmt.percent', () => {
  it('formats a percentage with default 1 decimal', () => {
    expect(fmt.percent(12.345)).toBe('12.3%');
  });

  it('formats a percentage with custom digits', () => {
    expect(fmt.percent(12.345, 2)).toBe('12.35%');
  });

  it('formats 0%', () => {
    expect(fmt.percent(0)).toBe('0.0%');
  });

  it('formats 100%', () => {
    expect(fmt.percent(100)).toBe('100.0%');
  });
});

describe('fmt.energyKwh', () => {
  it('formats kWh directly for values under 1000', () => {
    expect(fmt.energyKwh(500)).toBe('500 kWh');
  });

  it('formats MWh for values 1000+', () => {
    const result = fmt.energyKwh(1500);
    expect(result).toContain('MWh');
    expect(result).toContain('1.5');
  });

  it('formats GWh for values 1M+', () => {
    const result = fmt.energyKwh(1_500_000);
    expect(result).toContain('GWh');
    expect(result).toContain('1.50');
  });
});

describe('fmt.co2Tonnes', () => {
  it('converts kg to tonnes', () => {
    expect(fmt.co2Tonnes(2000)).toBe('2.00 t');
  });

  it('formats fractional tonnes', () => {
    expect(fmt.co2Tonnes(1500)).toBe('1.50 t');
  });
});

describe('fmt (inherited from shared)', () => {
  it('fmt.xlm formats XLM from stroops', () => {
    expect(fmt.xlm(10_000_000n)).toBe('1.00');
  });

  it('fmt.usdc formats USDC', () => {
    expect(fmt.usdc(1_000_000n)).toBe('1.00');
  });

  it('fmt.address shortens a Stellar address', () => {
    const addr = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTU';
    const result = fmt.address(addr);
    expect(result).toContain('…');
  });
});
