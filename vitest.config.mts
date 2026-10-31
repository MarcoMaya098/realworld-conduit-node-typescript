import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    env: {
      // Relative to prisma/schema.prisma, like the dev database.
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret',
      LOG_LEVEL: 'silent',
      // The suites register many users; rate limiting has its own tests with a strict limit.
      REGISTER_RATE_LIMIT_MAX: '0',
      LOGIN_RATE_LIMIT_MAX: '0',
    },
    // One SQLite file shared by every integration test: run files sequentially.
    fileParallelism: false,
  },
});
