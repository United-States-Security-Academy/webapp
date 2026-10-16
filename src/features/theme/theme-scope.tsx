'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { THEME_COOKIE_NAME, type ThemePreference } from './theme-preference';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

type ThemeContextValue = { preference: ThemePreference; setPreference: (preference: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The root element of a dashboard shell. Its theme-light / theme-dark / theme-system class swaps
// the colour variables in globals.css for everything inside it. Only the dashboard and console
// layouts render one, so the marketing pages always stay light.
export function ThemeScope({
  initialPreference,
  className,
  children,
}: {
  initialPreference: ThemePreference;
  className: string;
  children: React.ReactNode;
}) {
  const [preference, setPreferenceState] = useState(initialPreference);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    document.cookie = `${THEME_COOKIE_NAME}=${nextPreference}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
  }, []);

  const contextValue = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <div className={`theme-${preference} ${className}`}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useThemePreference(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
