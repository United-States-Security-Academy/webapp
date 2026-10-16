import { describe, expect, it } from 'vitest';
import { parseThemePreference } from '@/features/theme/theme-preference';

describe('parseThemePreference', () => {
  it('reads a saved light, dark or system choice', () => {
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('system')).toBe('system');
  });

  it('falls back to light when there is no cookie or it holds something else', () => {
    expect(parseThemePreference(undefined)).toBe('light');
    expect(parseThemePreference('')).toBe('light');
    expect(parseThemePreference('DARK')).toBe('light');
    expect(parseThemePreference('blue')).toBe('light');
  });
});
