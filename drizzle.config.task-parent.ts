import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.task-parent.ts",
  out: "./db/migrations/task-parent",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_TASK_PARENT_DATABASE_URL!,
    authToken: process.env.TURSO_TASK_PARENT_AUTH_TOKEN,
  },
} satisfies Config;
