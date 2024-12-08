import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users } from "@/db/schema.user";
import { eq } from "drizzle-orm";

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
  const { email, password } = req.body;

  const queryResults = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
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
    return res.status(200).json({ token });
  }
}
