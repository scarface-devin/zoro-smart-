import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.INDEXER_DATABASE_URL ??
      'postgres://solshare:solshare@localhost:5432/solshare',
  },
});
