import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'lence/frontend/**/__tests__/*.test.ts',
      'lence/frontend/tests/**/*.test.ts',
    ],
  },
});
