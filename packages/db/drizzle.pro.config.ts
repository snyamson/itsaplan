import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// The Pro tables (src/schema/pro.ts), generated into a folder of their own that the
// migrate step applies through BUILD_MIGRATIONS_DIR.
config({ path: '../../.env', quiet: true });

export default defineConfig({
  schema: './src/schema/pro.ts',
  out: './drizzle-pro',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
