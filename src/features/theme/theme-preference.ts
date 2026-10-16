// Light / dark mode for the dashboards. The choice is kept in a cookie (not localStorage) so the
// server renders the right colours on the first paint, with no flash of the wrong theme.
export const THEME_COOKIE_NAME = 'ussa-theme';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

// Light until the user picks otherwise, so nobody's dashboard changes without them asking.
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';

export function parseThemePreference(value: string | undefined): ThemePreference {
  return THEME_PREFERENCES.find((preference) => preference === value) ?? DEFAULT_THEME_PREFERENCE;
}
