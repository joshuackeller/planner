import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.postgres.ts",
  out: "./db/migrations/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
