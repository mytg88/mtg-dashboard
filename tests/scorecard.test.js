import { describe, it, expect } from 'vitest';
import helpers from '../assets/helpers.js';

const { SCORE_QUESTIONS, SCORE_THEMES, scoreGrade, scoreGradeColor, scoreCompute, annualValue, hasScore } = helpers;

const allAnswers = (v) => Object.fromEntries(SCORE_QUESTIONS.map(q => [q.id, v]));

describe('SCORE_QUESTIONS', () => {
  it('has 20 uniquely numbered questions, all in a known theme', () => {
    expect(SCORE_QUESTIONS).toHaveLength(20);
    expect(new Set(SCORE_QUESTIONS.map(q => q.id)).size).toBe(20);
    SCORE_QUESTIONS.forEach(q => {
      expect(SCORE_THEMES).toContain(q.t);
      expect(q.o).toHaveLength(3);
    });
  });

  it('double-weights exactly the seven importance-3 questions', () => {
    expect(SCORE_QUESTIONS.filter(q => q.m === 2)).toHaveLength(7);
  });
});

describe('scoreGrade', () => {
  it('maps percentages onto grade bands at the boundaries', () => {
    expect(scoreGrade(100)).toBe('A');
    expect(scoreGrade(80)).toBe('A');
    expect(scoreGrade(79)).toBe('B');
    expect(scoreGrade(65)).toBe('B');
    expect(scoreGrade(64)).toBe('C');
    expect(scoreGrade(50)).toBe('C');
    expect(scoreGrade(49)).toBe('Review');
    expect(scoreGrade(0)).toBe('Review');
  });
});

describe('scoreGradeColor', () => {
  it('gives each grade its own colour', () => {
    const colors = ['A', 'B', 'C', 'Review'].map(scoreGradeColor);
    expect(new Set(colors).size).toBe(4);
    expect(scoreGradeColor('Review')).toBe('var(--red)');
  });
});

describe('scoreCompute', () => {
  it('reports an empty, incomplete result when nothing is answered', () => {
    expect(scoreCompute({})).toEqual({
      got: 0, ansMax: 0, ans: 0, total: 20, pct: 0, grade: 'Review', poor: 0, complete: false
    });
    expect(scoreCompute(null).ans).toBe(0);
    expect(scoreCompute(undefined).ans).toBe(0);
  });

  it('scores a fully top-marked card as 100% grade A and complete', () => {
    const r = scoreCompute(allAnswers(3));
    expect(r).toMatchObject({ ans: 20, pct: 100, grade: 'A', poor: 0, complete: true });
  });

  it('scores a fully bottom-marked card as 33% with every question flagged poor', () => {
    const r = scoreCompute(allAnswers(1));
    expect(r).toMatchObject({ pct: 33, grade: 'Review', poor: 20, complete: true });
  });

  it('weights the importance-3 questions double', () => {
    const heavy = SCORE_QUESTIONS.find(q => q.m === 2);
    const light = SCORE_QUESTIONS.find(q => q.m === 1);
    expect(scoreCompute({ [heavy.id]: 3 }).got).toBe(6);
    expect(scoreCompute({ [light.id]: 3 }).got).toBe(3);
  });

  it('is a percentage of the answered questions only, so it works mid-way', () => {
    const answered = SCORE_QUESTIONS.slice(0, 4);
    const r = scoreCompute(Object.fromEntries(answered.map(q => [q.id, 3])));
    expect(r.ans).toBe(4);
    expect(r.pct).toBe(100);
    expect(r.complete).toBe(false);
  });

  it('ignores out-of-range and unknown answers', () => {
    const q = SCORE_QUESTIONS[0];
    const r = scoreCompute({ [q.id]: 4, 999: 3, [SCORE_QUESTIONS[1].id]: 0 });
    expect(r.ans).toBe(0);
    expect(r.got).toBe(0);
  });
});

describe('annualValue', () => {
  it('uses the visit price with the stated cadence', () => {
    expect(annualValue({ visit: 50, freq: 'Weekly' })).toBe(2600);
    expect(annualValue({ visit: 50, freq: 'Every 2 weeks' })).toBe(1300);
    expect(annualValue({ visit: 50, freq: 'Every 4 weeks' })).toBe(650);
    expect(annualValue({ visit: 50, freq: 'Monthly' })).toBe(600);
  });

  it('defaults to fortnightly when the cadence is unknown or missing', () => {
    expect(annualValue({ visit: 50, freq: 'now and then' })).toBe(1300);
    expect(annualValue({ visit: 50 })).toBe(1300);
  });

  it('falls back to the average job value when no visit price is set', () => {
    expect(annualValue({ r: 520, j: 10, freq: 'Weekly' })).toBe(2704);
  });

  it('is 0 for a missing customer or one with no money on file', () => {
    expect(annualValue(null)).toBe(0);
    expect(annualValue({ freq: 'Weekly' })).toBe(0);
  });
});

describe('hasScore', () => {
  it('is true only when at least one answer is stored', () => {
    expect(hasScore({ score: { scores: { 1: 3 } } })).toBe(true);
    expect(hasScore({ score: { scores: {} } })).toBe(false);
    expect(hasScore({ score: {} })).toBe(false);
    expect(hasScore({})).toBe(false);
    expect(hasScore(null)).toBe(false);
  });
});
