import { text, sqliteTable } from "drizzle-orm/sqlite-core";
import { customAlphabet } from "nanoid";

export const generateId = (): string => {
  const nanoid = customAlphabet("23456789ABCDEFGHIJKMNPQRSTUVWXYZ", 8);
  return nanoid();
};

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .default(generateId as any),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
});
