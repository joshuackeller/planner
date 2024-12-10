import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.user.ts",
  out: "./db/migrations-user",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_USER_DATABASE_URL!,
    authToken: process.env.TURSO_USER_AUTH_TOKEN,
  },
} satisfies Config;
