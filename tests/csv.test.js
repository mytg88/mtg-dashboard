import { describe, it, expect } from 'vitest';
import helpers from '../assets/helpers.js';

const { parseCSVLine, parseCSV, parseCSVSmart, parseAmount, col, PHONE_HEADERS } = helpers;

describe('parseCSVLine', () => {
  it('splits a plain line on commas', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps commas that sit inside quotes', () => {
    expect(parseCSVLine('"Smith, John",£40,Mowing')).toEqual(['Smith, John', '£40', 'Mowing']);
  });

  it('emits empty strings for empty fields', () => {
    expect(parseCSVLine('a,,c,')).toEqual(['a', '', 'c', '']);
    expect(parseCSVLine('')).toEqual(['']);
  });
});

describe('parseCSV', () => {
  it('maps each row onto the trimmed header names', () => {
    const rows = parseCSV('Name, Amount \nJo,40\nSam,55\n');
    expect(rows).toEqual([
      { Name: 'Jo', Amount: '40' },
      { Name: 'Sam', Amount: '55' }
    ]);
  });

  it('skips blank lines and pads missing trailing cells', () => {
    const rows = parseCSV('Name,Amount\nJo\n\n   \nSam,55');
    expect(rows).toEqual([
      { Name: 'Jo', Amount: '' },
      { Name: 'Sam', Amount: '55' }
    ]);
  });

  it('returns nothing when there is no data row', () => {
    expect(parseCSV('Name,Amount')).toEqual([]);
    expect(parseCSV('')).toEqual([]);
  });
});

describe('parseCSVSmart', () => {
  it('finds the header row underneath a banner row', () => {
    const text = 'Zenbooker export\n\nCustomer,Amount\nJo,40';
    expect(parseCSVSmart(text, ['customer'])).toEqual([{ Customer: 'Jo', Amount: '40' }]);
  });

  it('falls back to the first line when no keyword matches', () => {
    expect(parseCSVSmart('A,B\n1,2', ['nothing'])).toEqual([{ A: '1', B: '2' }]);
  });

  it('only scans the first 12 lines for the header', () => {
    const text = Array(12).fill('junk').join('\n') + '\nCustomer,Amount\nJo,40';
    const rows = parseCSVSmart(text, ['customer']);
    expect(rows[0]).not.toHaveProperty('Customer');
  });

  it('drops rows where every cell is empty', () => {
    expect(parseCSVSmart('Customer,Amount\n,,\nJo,40', ['customer'])).toEqual([
      { Customer: 'Jo', Amount: '40' }
    ]);
  });
});

describe('parseAmount', () => {
  it('strips currency symbols and thousands separators', () => {
    expect(parseAmount('£1,234.50')).toBe(1234.5);
    expect(parseAmount('40')).toBe(40);
  });

  it('returns 0 for blank or unparseable input', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
    expect(parseAmount('n/a')).toBe(0);
  });
});

describe('col', () => {
  const row = { ' Customer Name ': 'Jo', 'Total Amount': '40', Notes: '' };

  it('prefers an exact case-insensitive header match', () => {
    expect(col(row, ['customer name'])).toBe('Jo');
  });

  it('falls back to a substring match', () => {
    expect(col(row, ['amount'])).toBe('40');
  });

  it('tries candidates in order, exact matches first', () => {
    expect(col(row, ['notes', 'customer name'])).toBe('');
    expect(col(row, ['missing', 'total amount'])).toBe('40');
  });

  it('returns an empty string when nothing matches', () => {
    expect(col(row, ['postcode'])).toBe('');
  });

  it('works with the phone header list the dashboard passes in', () => {
    expect(col({ Mobile: '07713 000111' }, PHONE_HEADERS)).toBe('07713 000111');
  });
});
