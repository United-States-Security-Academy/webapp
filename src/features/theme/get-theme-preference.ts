import { cookies } from 'next/headers';
import { THEME_COOKIE_NAME, parseThemePreference, type ThemePreference } from './theme-preference';

export async function getThemePreference(): Promise<ThemePreference> {
  const cookieStore = await cookies();
  return parseThemePreference(cookieStore.get(THEME_COOKIE_NAME)?.value);
}
