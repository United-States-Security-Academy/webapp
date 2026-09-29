import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@/env', replacement: path.resolve(import.meta.dirname, 'env.ts') },
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
    ],
  },
});
