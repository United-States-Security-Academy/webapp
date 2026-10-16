import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // tsconfig leaves JSX to Next.js ("preserve"); tests that render components need it compiled.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: [
      { find: '@/env', replacement: path.resolve(import.meta.dirname, 'env.ts') },
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
    ],
  },
});
