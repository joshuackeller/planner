import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usersTable } from "@/db/schema.postgres";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { email, password } = req.body;

    const queryResults = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (queryResults.length !== 1) {
      return res.status(400).send({ error: "Error signing in" });
    }

    const user = queryResults[0];

    const passwordIsCorrect = bcrypt.compareSync(password, user.password_hash);

    if (!passwordIsCorrect) {
      return res.status(401).send({ error: "Error signing in" });
    } else {
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
      return res.status(200).json({ token, userId: user.id });
    }
  } catch (error) {
    console.log("ERROR", error);
    return res.status(400).send({ error: "woops" });
  }
}
