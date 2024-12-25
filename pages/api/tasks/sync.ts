import type { NextApiResponse } from "next";
import { eq } from "drizzle-orm";
import { QueueUpdateRecord } from "@/lib/types";
import { AuthenticatedRequest, withAuthentication } from "@/lib/authenticate";
import { tasks as taskSchema } from "@/db/schema.task-parent";

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { db } = req.user;
  const { id, data, type } = req.body as QueueUpdateRecord;

  if (!id) return res.status(400).json({ error: "No ID" });

  const queryResults = await db
    .select()
    .from(taskSchema)
    .where(eq(taskSchema.id, id))
    .limit(1);

  if (type === "update") {
    if (!data) return res.status(400).json({ error: "No Data" });
    if (queryResults.length === 1) {
      // update
      await db.update(taskSchema).set(data).where(eq(taskSchema.id, id));
    } else if (queryResults.length === 0) {
      // create
      await db.insert(taskSchema).values({
        id,
        name: data.name || "",
        date: data.date || "",
        updated: data.updated || Date.now(),
        period: data.period || "",
        ...data,
      });
    }
  }
  if (type === "delete") {
    if (queryResults.length === 1) {
      // delete
      await db.delete(taskSchema).where(eq(taskSchema.id, id));
    }
  }

  return res.status(204).send("");
};

export default withAuthentication(handler);
