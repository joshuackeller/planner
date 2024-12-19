import { tasks as taskSchema } from "@/db/schema.task-parent";
import { AuthenticatedRequest, withAuthentication } from "@/lib/authenticate";
import { gt } from "drizzle-orm";
import type { NextApiResponse } from "next";

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { db } = req.user;
  const { updated } = req.query;

  const query = db.select().from(taskSchema);
  if (updated !== undefined && typeof updated === "string") {
    query.where(gt(taskSchema.updated, parseInt(updated)));
  }
  const tasks = await query;

  return res.status(200).json(tasks);
};

export default withAuthentication(handler);
