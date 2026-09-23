import { describe, it, expect } from 'vitest';
import { stageStatus, sanitizeError } from './utils';

describe('stageStatus', () => {
  it('returns done when current is 10+ ahead of stage', () => {
    expect(stageStatus(10, 20)).toBe('done');
  });

  it('returns active when current is within 10 of stage', () => {
    expect(stageStatus(25, 20)).toBe('active');
  });

  it('returns pending when current is more than 10 behind stage', () => {
    expect(stageStatus(50, 20)).toBe('pending');
  });

  it('boundary: currentPct === stagePct + 10 is done', () => {
    expect(stageStatus(10, 20)).toBe('done');
  });

  it('boundary: currentPct === stagePct - 10 is active, not pending', () => {
    expect(stageStatus(30, 20)).toBe('active');
  });

  it('boundary: currentPct one below stagePct - 10 is pending', () => {
    expect(stageStatus(32, 20)).toBe('pending');
  });

  it('all stages with 0% progress are pending except first active window', () => {
    expect(stageStatus(10, 0)).toBe('active');
    expect(stageStatus(25, 0)).toBe('pending');
  });

  it('earlier stages are done at 100%', () => {
    expect(stageStatus(10, 100)).toBe('done');
    expect(stageStatus(75, 100)).toBe('done');
  });

  it('the last stage (95%) stays active at 100% — it has no done threshold above it', () => {
    // 100 < 95+10=105 so never "done"; 100 >= 95-10=85 so "active"
    expect(stageStatus(95, 100)).toBe('active');
  });
});

describe('sanitizeError', () => {
  it('replaces JSON error strings with a user-friendly message', () => {
    const result = sanitizeError('{"error":"not found"}');
    expect(result).toBe('Repository not found or is private. Please check the URL and try again.');
  });

  it('passes through plain string errors unchanged', () => {
    expect(sanitizeError('Network error')).toBe('Network error');
  });

  it('passes through empty string unchanged', () => {
    expect(sanitizeError('')).toBe('');
  });

  it('passes through strings that contain { but do not start with it', () => {
    const msg = 'Error: {code: 404}';
    expect(sanitizeError(msg)).toBe(msg);
  });
});
