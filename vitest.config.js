import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.js'],
    exclude: ['node_modules', 'dist', 'tests/integration'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['module/**/*.js'],
      exclude: [
        'module/setup/**', // Initialization code
        'module/config/**', // Constants
        '**/*.test.js'
      ],
      // NOTE: Don't chase 100% coverage - focus on critical code
      thresholds: {
        statements: 0,  // Start at 0, increase as tests are added
        branches: 0,
        functions: 0,
        lines: 0
      }
    },
    testTimeout: 5000,
    hookTimeout: 10000
  }
});
