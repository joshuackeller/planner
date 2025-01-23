import type { NextApiResponse } from "next";
import { and, eq } from "drizzle-orm";
import { QueueUpdateRecord } from "@/lib/types";
import { AuthenticatedRequest, withAuthentication } from "@/lib/authenticate";
import { tasksTable } from "@/db/schema.postgres";
import { db } from "@/db";

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const userId = req.userId;
  const { id, data, type } = req.body as QueueUpdateRecord;

  if (!id) return res.status(400).json({ error: "No ID" });

  const queryResults = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .limit(1);

  if (type === "update") {
    if (!data) return res.status(400).json({ error: "No Data" });
    if (queryResults.length === 1) {
      // update
      await db
        .update(tasksTable)
        .set(data)
        .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
    } else if (queryResults.length === 0) {
      // create
      await db.insert(tasksTable).values({
        id,
        userId,
        name: data.name || "",
        date: data.date || "",
        updated: data.updated || Date.now(),
        period: data.period || "",
        sortOrder: data.sort_order || 0,
        complete: false,
      });
    }
  }
  if (type === "delete") {
    if (queryResults.length === 1) {
      // delete
      await db
        .delete(tasksTable)
        .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
    }
  }

  return res.status(204).send("");
};

export default withAuthentication(handler);
