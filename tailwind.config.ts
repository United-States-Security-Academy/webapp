import type { Config } from 'tailwindcss';

// Light and dark mode for the dashboards (/dashboard, /instructor, /admin) — see
// src/features/theme. The neutral and status colours below read CSS variables. Their default
// values in globals.css are exactly Tailwind's own colours, so every page looks the same as before
// unless it sits inside a dark ThemeScope, which swaps the variables. The marketing pages never do.
const themed = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;
const themedScale = (name: string, shades: number[], prefix = name) =>
  Object.fromEntries(shades.map((shade) => [shade, themed(`${prefix}-${shade}`)]));

const ALL_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const STATUS_COLORS = ['red', 'green', 'amber'];

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  // `dark:` applies inside a dark ThemeScope, or a "system" one when the device is in dark mode,
  // but never inside a .theme-fixed area (navy sidebars, the certificate) and never when printing.
  darkMode: [
    'variant',
    [
      '@media screen { &:is(.theme-dark, .theme-dark *):not(.theme-fixed, .theme-fixed *) }',
      '@media screen and (prefers-color-scheme: dark) { &:is(.theme-system, .theme-system *):not(.theme-fixed, .theme-fixed *) }',
    ],
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060e1f',
          900: '#0b1e3d',
          800: '#122a52',
        },
        gold: {
          400: '#d4b06a',
          500: '#c6a15b',
          600: '#b3893f',
        },
        slate: themedScale('slate', ALL_SHADES),
        // Pale status backgrounds and borders (alerts, badges, callouts).
        ...Object.fromEntries(STATUS_COLORS.map((color) => [color, themedScale(color, [50, 100, 200])])),
      },
      // Colours that mean something different as text than as a background: navy headings turn
      // light in dark mode while navy buttons stay navy; dark status text turns light.
      textColor: {
        navy: { 800: themed('navy-text-800'), 900: themed('navy-text-900') },
        gold: { 600: themed('gold-text-600') },
        ...Object.fromEntries(STATUS_COLORS.map((color) => [color, themedScale(color, [600, 700, 800, 900])])),
      },
      // White cards become dark cards; dark slate/navy buttons stay dark (with white text) instead
      // of flipping light like slate text does.
      backgroundColor: {
        white: themed('surface'),
        slate: themedScale('slate', [600, 700, 800, 900, 950], 'slate-bg'),
        navy: { 800: themed('navy-bg-800'), 900: themed('navy-bg-900') },
      },
      gradientColorStops: {
        white: themed('surface'),
      },
      borderColor: {
        navy: { 800: themed('navy-border-800'), 900: themed('navy-border-900') },
      },
      ringColor: {
        navy: { 800: themed('navy-border-800') },
      },
    },
  },
  plugins: [],
};

export default config;
