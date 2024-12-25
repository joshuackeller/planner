import { generateId, isoShortDate, startOfPeriod } from "@/lib/utils";
import {
  endOfDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import initSqlJs, { Database } from "sql.js";
import { drizzle, SQLJsDatabase } from "drizzle-orm/sql-js";
import { tasks as taskSchema } from "@/db/schema.task-parent";
import { and, between, desc, eq } from "drizzle-orm";
import { AUTH_KEY } from "@/components/Auth";
import { Period, QueueUpdateRecord, Task } from "./types";

const DB_KEY = "PLANNER_SQLITE";
const QUEUE_UPDATES_KEY = "UPDATES_QUEUE";

export const runSQLite = async (setDb: (db: LocalDB) => void) => {
  const SQL = await initSqlJs({
    locateFile: (file) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
  });

  setDb(new LocalDB(SQL));
};

export class LocalDB {
  sqlite: Database;
  db: SQLJsDatabase;

  constructor(SQL: initSqlJs.SqlJsStatic) {
    const savedData = localStorage.getItem(DB_KEY);
    if (savedData) {
      const binaryArray = new Uint8Array(JSON.parse(savedData));
      this.sqlite = new SQL.Database(binaryArray);
      this.db = drizzle(this.sqlite);
    } else {
      this.sqlite = new SQL.Database();
      this.sqlite.run(`
                      CREATE TABLE task (
                        id TEXT UNIQUE,
                        name TEXT,
                        complete BOOLEAN,
                        sort_order INTEGER DEFAULT 0,
                        period TEXT,
                        date TEXT,
                        updated INTEGER);
                        `);
      this.db = drizzle(this.sqlite);
    }
  }

  save() {
    localStorage.setItem(
      DB_KEY,
      JSON.stringify(Array.from(this.sqlite.export()))
    );
  }

  addToQueue(update: QueueUpdateRecord) {
    const updates: QueueUpdateRecord[] = JSON.parse(
      localStorage.getItem(QUEUE_UPDATES_KEY) || "[]"
    );
    updates.push(update);
    localStorage.setItem(QUEUE_UPDATES_KEY, JSON.stringify(updates));
  }

  async list(day?: Date, period?: Period): Promise<Task[]> {
    const where = [];
    if (day) {
      const start = period ? startOfPeriod(day, period) : startOfDay(day);
      const end = endOfDay(start);
      where.push(
        between(taskSchema.date, isoShortDate(start), isoShortDate(end))
      );
    }
    if (period) {
      where.push(eq(taskSchema.period, period));
    }

    const data = await this.db
      .select()
      .from(taskSchema)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(taskSchema.sort_order);

    return data;
  }

  async read(id: string): Promise<Task | null> {
    const data = await this.db
      .select()
      .from(taskSchema)
      .where(eq(taskSchema.id, id))
      .limit(1);

    if (data.length === 0) {
      return null;
    } else {
      return data[0];
    }
  }

  async checkExists(id: string): Promise<Task> {
    const task = await this.read(id);
    if (task === null) {
      throw Error("Not Found");
    }
    return task;
  }

  async create(task: {
    id?: string;
    name: string;
    complete?: boolean;
    sort_order?: number;
    period: Period;
    date: Date;
    updated?: number;
  }): Promise<Task> {
    const currentTasks = await this.list(task.date);

    const values = {
      id: task.id || generateId(),
      name: task.name,
      complete: typeof task.complete === "boolean" ? task.complete : false,
      sort_order: task.sort_order || currentTasks.length + 1,
      period: task.period,
      date: isoShortDate(startOfPeriod(task.date, task.period)),
      updated: task.updated || Date.now(),
    };
    const [data] = await this.db.insert(taskSchema).values(values).returning();
    this.save();
    this.addToQueue({ id: values.id, data: values, type: "update" });

    return data;
  }

  async update(task: {
    id: string;
    name?: string;
    complete?: boolean;
    sort_order?: number;
    updated?: number;
  }): Promise<Task> {
    const cur = await this.checkExists(task.id);

    if (!task.updated) {
      if (typeof task.name === "string" && task.name !== cur.name) {
        task.updated = Date.now();
      } else if (
        typeof task.complete === "boolean" &&
        task.complete !== cur.complete
      ) {
        task.updated = Date.now();
      } else if (
        typeof task.sort_order === "number" &&
        task.sort_order !== cur.sort_order
      ) {
        task.updated = Date.now();
      }
    }
    const [data] = await this.db
      .update(taskSchema)
      .set(task)
      .where(eq(taskSchema.id, task.id))
      .returning();
    this.save();
    this.addToQueue({ id: task.id, data: task, type: "update" });

    return data;
  }

  async delete(id: string) {
    const taskToBeDeleted = await this.checkExists(id);

    await this.db.delete(taskSchema).where(eq(taskSchema.id, id));
    this.addToQueue({ id, type: "delete" });

    const data = await this.list(
      parseISO(taskToBeDeleted.date),
      taskToBeDeleted.period as Period
    );
    this.updateOrder(
      parseISO(taskToBeDeleted.date),
      taskToBeDeleted.period as Period,
      data.filter(({ id }) => taskToBeDeleted.id !== id).map(({ id }) => id)
    );
  }

  async copyIncompletes(day: Date, period: Period) {
    const previous =
      period === "days"
        ? await this.list(startOfDay(subDays(day, 1)), period)
        : period === "weeks"
        ? await this.list(startOfWeek(subWeeks(day, 1)), period)
        : period === "months"
        ? await this.list(startOfMonth(subMonths(day, 1)), period)
        : await this.list(startOfYear(subYears(day, 1)), period);
    const incompletes = previous.filter((task) => !task.complete);

    for (const task of incompletes) {
      await this.create({ name: task.name, period, date: day });
    }
    this.save();
  }

  async clearPeriod(day: Date, period: Period) {
    const tasks = await this.list(day, period);
    for (const task of tasks) {
      await this.delete(task.id);
    }
    this.save();
  }

  async updateOrder(day: Date, period: Period, orderedIds: string[]) {
    const tasks = await this.list(day, period);
    const taskIdsForDay = new Set(tasks.map((task) => task.id));

    for (const id of orderedIds) {
      if (!taskIdsForDay.has(id)) {
        throw new Error(
          `Task with id ${id} does not exist for the specified day.`
        );
      }
    }

    await Promise.all(
      orderedIds.map((id, index) => this.update({ id, sort_order: index }))
    );

    this.save();
  }

  async syncPull() {
    const token = localStorage.getItem(AUTH_KEY);
    if (!token) return;

    const params = new URLSearchParams();
    const results = await this.db
      .select()
      .from(taskSchema)
      .orderBy(desc(taskSchema.updated))
      .limit(1);
    if (results.length > 0) {
      params.append("updated", results[0].updated.toString());
    }

    try {
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        method: "GET",
        headers: {
          authorization: token,
        },
      });

      const tasks: Task[] = await response.json();

      for (const task of tasks) {
        const existing_task = await this.read(task.id);
        if (!existing_task) {
          await this.create({
            ...task,
            period: task.period as Period,
            date: parseISO(task.date),
          });
        } else if (task.updated > existing_task.updated) {
          await this.update(task);
        }
      }
    } catch (error) {
      console.error("COULD NOT PULL", error);
    }
  }

  async syncPush() {
    const token = localStorage.getItem(AUTH_KEY);
    if (!token) return;

    const updates: QueueUpdateRecord[] = JSON.parse(
      localStorage.getItem(QUEUE_UPDATES_KEY) || "[]"
    );
    localStorage.removeItem(QUEUE_UPDATES_KEY);

    for (const update of updates) {
      try {
        await fetch(`/api/tasks/sync`, {
          method: "POST",
          body: JSON.stringify(update),
          headers: {
            authorization: token,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("COULD NOT PUSH RECORD", error);
      }
    }
  }
}
