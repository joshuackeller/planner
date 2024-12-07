import { text, sqliteTable } from "drizzle-orm/sqlite-core";
import { customAlphabet } from "nanoid";

const generateId = (): string => {
  const nanoid = customAlphabet("23456789ABCDEFGHIJKMNPQRSTUVWXYZ", 8);
  return nanoid();
};

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .default(generateId as any),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  database_url: text("database_url"),
});
