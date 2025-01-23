import { text, sqliteTable, integer } from "drizzle-orm/sqlite-core";

export const tasksTable = sqliteTable("task", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  complete: integer("complete", { mode: "boolean" }).notNull().default(false),
  sort_order: integer("sort_order").notNull().default(0),
  period: text("period").notNull(),
  date: text("date").notNull(),
  updated: integer("updated").notNull(),
});
