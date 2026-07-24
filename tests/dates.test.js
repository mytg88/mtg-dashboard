import { describe, it, expect, afterEach, vi } from 'vitest';
import helpers from '../assets/helpers.js';

const { parseDate, daysBetween, monthKey, monthOverlaps, ukTaxYearBounds, prevUkTaxYear, prevBounds } = helpers;

describe('parseDate', () => {
  it('reads UK day-first dates', () => {
    const d = parseDate('05/06/2026');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 5]);
  });

  it('ignores a trailing time on a day-first date', () => {
    const d = parseDate('05/06/2026, 14:30');
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(0);
  });

  it('reads ISO dates as local midnight', () => {
    const d = parseDate('2026-05-20T14:30:00Z');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 4, 20]);
    expect(d.getHours()).toBe(0);
  });

  it('passes through valid Date objects and rejects invalid ones', () => {
    const d = new Date(2026, 0, 2);
    expect(parseDate(d)).toBe(d);
    expect(parseDate(new Date('nope'))).toBeNull();
  });

  it('returns null for empty or unparseable values', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate('   ')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });

  it('falls back to Date parsing for other formats', () => {
    expect(parseDate('June 5, 2026').getMonth()).toBe(5);
  });
});

describe('daysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 11))).toBe(10);
  });

  it('is negative when the second date is earlier', () => {
    expect(daysBetween(new Date(2026, 0, 11), new Date(2026, 0, 1))).toBe(-10);
  });

  it('floors partial days', () => {
    expect(daysBetween(new Date(2026, 0, 1, 0), new Date(2026, 0, 2, 23))).toBe(1);
  });
});

describe('monthKey', () => {
  it('formats as YYYY-MM with a padded month', () => {
    expect(monthKey(new Date(2026, 0, 31))).toBe('2026-01');
    expect(monthKey(new Date(2026, 11, 1))).toBe('2026-12');
  });
});

describe('monthOverlaps', () => {
  const bounds = { from: new Date(2026, 4, 10), to: new Date(2026, 6, 5, 23, 59, 59) };

  it('includes months that touch the window at either edge', () => {
    expect(monthOverlaps('2026-05', bounds)).toBe(true);
    expect(monthOverlaps('2026-07', bounds)).toBe(true);
  });

  it('includes months fully inside the window', () => {
    expect(monthOverlaps('2026-06', bounds)).toBe(true);
  });

  it('excludes months outside the window', () => {
    expect(monthOverlaps('2026-04', bounds)).toBe(false);
    expect(monthOverlaps('2026-08', bounds)).toBe(false);
  });

  it('treats an open-ended window as matching everything', () => {
    expect(monthOverlaps('1999-01', { from: null, to: null })).toBe(true);
    expect(monthOverlaps('1999-01', { from: new Date(2026, 0, 1), to: null })).toBe(true);
  });
});

describe('ukTaxYearBounds', () => {
  it('runs 6 April to 5 April for a date after the switch', () => {
    const b = ukTaxYearBounds(new Date(2026, 5, 1));
    expect(monthKey(b.from)).toBe('2026-04');
    expect(b.from.getDate()).toBe(6);
    expect(monthKey(b.to)).toBe('2027-04');
    expect(b.to.getDate()).toBe(5);
  });

  it('rolls back to the previous year for a date before 6 April', () => {
    const b = ukTaxYearBounds(new Date(2026, 0, 15));
    expect(b.from.getFullYear()).toBe(2025);
    expect(b.to.getFullYear()).toBe(2026);
  });

  it('treats 6 April itself as the start of the new year', () => {
    expect(ukTaxYearBounds(new Date(2026, 3, 6)).from.getFullYear()).toBe(2026);
    expect(ukTaxYearBounds(new Date(2026, 3, 5)).from.getFullYear()).toBe(2025);
  });
});

describe('prevUkTaxYear', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('is the tax year before the current one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1));
    const b = prevUkTaxYear();
    expect(b.from.getFullYear()).toBe(2025);
    expect(b.from.getDate()).toBe(6);
    expect(b.to.getFullYear()).toBe(2026);
    expect(b.to.getDate()).toBe(5);
  });
});

describe('prevBounds', () => {
  it('shifts the window back exactly one year', () => {
    const b = prevBounds({ from: new Date(2026, 5, 1), to: new Date(2026, 5, 30) });
    expect(b.from.getFullYear()).toBe(2025);
    expect(b.from.getMonth()).toBe(5);
    expect(b.to.getDate()).toBe(30);
  });

  it('stays open-ended when the window is open-ended', () => {
    expect(prevBounds({ from: null, to: null })).toEqual({ from: null, to: null });
    expect(prevBounds({ from: new Date(2026, 0, 1), to: null })).toEqual({ from: null, to: null });
  });
});
