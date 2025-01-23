import { db } from "@/db";
import { tasksTable } from "@/db/schema.postgres";
import { AuthenticatedRequest, withAuthentication } from "@/lib/authenticate";
import { and, eq, gt } from "drizzle-orm";
import type { NextApiResponse } from "next";

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const userId = req.userId;
  const { updated } = req.query;

  const where = [eq(tasksTable.userId, userId)];

  if (updated !== undefined && typeof updated === "string") {
    where.push(gt(tasksTable.updated, parseInt(updated)));
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(...where));

  return res.status(200).json(tasks);
};

export default withAuthentication(handler);
