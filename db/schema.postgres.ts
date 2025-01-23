import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
});

export const tasksTable = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    complete: boolean("complete").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    period: text("period").notNull(),
    date: text("date").notNull(),
    updated: bigint("updated", { mode: "number" }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIndex: index("user_id_index").on(table.userId),
  })
);
