import { describe, it, expect } from 'vitest';
import helpers from '../assets/helpers.js';

const { normNum, isCallOpen, serviceGroup, normName, escAttr } = helpers;

describe('normNum', () => {
  it('reduces every UK mobile format to the same national number', () => {
    const forms = ['+44 7713 000111', '447713000111', '4407713000111', '07713 000111', '7713000111'];
    expect(new Set(forms.map(normNum))).toEqual(new Set(['7713000111']));
  });

  it('reduces landline formats to the same national number', () => {
    const forms = ['01202 736149', '1202736149', '+441202736149', '00441202736149'];
    expect(new Set(forms.map(normNum))).toEqual(new Set(['1202736149']));
  });

  it('drops punctuation and non-digits', () => {
    expect(normNum('(01202) 736-149')).toBe('1202736149');
  });

  it('returns an empty string for missing or digit-free input', () => {
    expect(normNum('')).toBe('');
    expect(normNum(null)).toBe('');
    expect(normNum(undefined)).toBe('');
    expect(normNum('no number here')).toBe('');
  });
});

describe('isCallOpen', () => {
  it('keeps unset and in-progress outcomes on the chase list', () => {
    ['', '   ', 'New', 'Needs callback', 'Left message', 'No answer'].forEach(st => {
      expect(isCallOpen(st)).toBe(true);
    });
    expect(isCallOpen(null)).toBe(true);
  });

  it('closes anything else', () => {
    ['Booked', 'Not interested', 'Won', 'no answer'].forEach(st => {
      expect(isCallOpen(st)).toBe(false);
    });
  });
});

describe('serviceGroup', () => {
  it('folds free-text service names into the canonical lines', () => {
    expect(serviceGroup('Regular Garden Maintenance - fortnightly')).toBe('Regular Garden Maintenance');
    expect(serviceGroup('hedge trim')).toBe('Hedge Cutting');
    expect(serviceGroup('Patio jet wash')).toBe('Pressure Washing & Exterior Cleaning');
    expect(serviceGroup('Tip run')).toBe('Garden Waste & Clearance');
    expect(serviceGroup('Scarifying and overseeding')).toBe('Lawn Care & Renovation');
    expect(serviceGroup('Mow')).toBe('Grass Cutting & Lawn Edging');
    expect(serviceGroup('Moss control')).toBe('Weed & Moss Control');
  });

  it('lets the first matching pattern win', () => {
    expect(serviceGroup('Assessment visit before hedge cutting')).toBe('Assessment visits');
  });

  it('buckets unknown and empty values as Other', () => {
    expect(serviceGroup('Christmas lights')).toBe('Other');
    expect(serviceGroup('')).toBe('Other');
    expect(serviceGroup(null)).toBe('Other');
  });
});

describe('normName', () => {
  it('trims and lowercases so name keys compare equal', () => {
    expect(normName('  Nicky Waters ')).toBe('nicky waters');
    expect(normName(null)).toBe('');
    expect(normName(undefined)).toBe('');
    expect(normName(42)).toBe('42');
  });
});

describe('escAttr', () => {
  it('escapes every character that could break out of an attribute', () => {
    expect(escAttr(`<a href="x" & 'y'>`)).toBe('&lt;a href=&quot;x&quot; &amp; &#39;y&#39;&gt;');
  });

  it('escapes the ampersand first so entities are not double-broken', () => {
    expect(escAttr('&lt;')).toBe('&amp;lt;');
  });

  it('returns an empty string for null or undefined', () => {
    expect(escAttr(null)).toBe('');
    expect(escAttr(undefined)).toBe('');
  });
});
