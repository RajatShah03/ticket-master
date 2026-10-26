import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@app/common': resolve(rootDir, 'libs/common/src'),
      '@app/database': resolve(rootDir, 'libs/database/src'),
      '@app/kafka': resolve(rootDir, 'libs/kafka/src'),
    },
  },
  test: {
    environment: 'node',
    include: ['apps/**/*.spec.ts', 'libs/**/*.spec.ts'],
    exclude: ['**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'apps/**/src/**/*.controller.ts',
        'apps/**/src/**/*.service.ts',
      ],
      thresholds: {
        statements: 100,
        lines: 100,
        functions: 100,
      },
    },
  },
});
