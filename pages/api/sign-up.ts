import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users } from "@/db/schema.user";
import { eq } from "drizzle-orm";
import { createClient } from "@tursodatabase/api";
import { generateId } from "@/lib/utils";

const ENABLED = false;

const turso = createClient({
  org: process.env.TURSO_ORGANIZATION_SLUG!,
  token: process.env.TURSO_PLATFORM_API_TOKEN!,
});

type Data =
  | {
      token: string;
    }
  | {
      error: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (!ENABLED) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const { email, password } = req.body;

  const queryResults = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // User with email already exists
  if (queryResults.length === 1) {
    return res.status(400).json({ error: "Error creating account" });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ id: generateId(), email, password_hash })
    .returning();

  if (!user) {
    return res.status(401).json({ error: "Error creating account" });
  }

  try {
    await turso.databases.create(user.id, {
      group: process.env.TURSO_TASK_GROUP,
      schema: process.env.TURSO_TASK_SCHEMA_DB_NAME,
    });
  } catch {
    await db.delete(users).where(eq(users.id, user.id));
    return res.status(401).json({ error: "Error creating account" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
  return res.status(200).json({ token });
}
