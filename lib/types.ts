import { tasks as taskSchema } from "@/db/schema.task-parent";

export type Task = typeof taskSchema.$inferSelect;

export type Period = "days" | "weeks" | "months" | "year";

export interface QueueUpdateRecord {
  id: string;
  data?: {
    name?: string;
    complete?: boolean;
    sort_order?: number;
    period?: Period;
    date?: string;
    updated?: number;
  };
  type: "update" | "delete";
}
