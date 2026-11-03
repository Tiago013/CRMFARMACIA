import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Lógica crítica: dinero, inventario y autorización
      include: ['src/lib/pos/**', 'src/lib/inventory/**', 'src/lib/analytics/**', 'src/lib/crm/**', 'src/lib/ai/**', 'src/lib/auth.ts', 'src/lib/decimal.ts', 'src/lib/roles.ts', 'src/lib/dates.ts', 'src/lib/reports/table.ts', 'src/lib/reports/zReport.ts', 'src/lib/whatsapp/messages.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
