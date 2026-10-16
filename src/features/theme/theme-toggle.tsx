'use client';

import { Icon, type IconName } from '@/components/ui/icon';
import { useThemePreference } from './theme-scope';
import type { ThemePreference } from './theme-preference';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

// Light / Dark / System switch for the navy dashboard sidebars (desktop and the mobile menu).
export function ThemeToggle() {
  const theme = useThemePreference();
  if (!theme) return null;

  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-3 gap-1 rounded-md bg-white/5 p-1">
      {THEME_OPTIONS.map((option) => {
        const isSelected = theme.preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => theme.setPreference(option.value)}
            className={`flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-semibold transition-colors ${
              isSelected ? 'bg-white/10 text-gold-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon name={option.icon} className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
