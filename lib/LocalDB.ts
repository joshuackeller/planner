import { generateId, startOfPeriod } from "@/lib/utils";
import {
  endOfDay,
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
import { tasks } from "@/db/schema.task-parent";
import { and, between, eq } from "drizzle-orm";

const DB_KEY = "PLANNER_SQLITE";

export const runSQLite = async (setDb: (db: LocalDB) => void) => {
  const SQL = await initSqlJs({
    locateFile: (file) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
  });

  setDb(new LocalDB(SQL));
};

export type Task = typeof tasks.$inferSelect;

export type Period = "days" | "weeks" | "months" | "year";

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
      this.db = drizzle(this.sqlite);
      this.db.run(`
                    CREATE TABLE task (
                      id TEXT UNIQUE,
                      name TEXT,
                      complete BOOLEAN,
                      sort_order INTEGER DEFAULT 0,
                      period TEXT,
                      date TEXT);
                     `);
    }
  }

  save() {
    localStorage.setItem(
      DB_KEY,
      JSON.stringify(Array.from(this.sqlite.export()))
    );
  }

  async list(day?: Date, period?: Period): Promise<Task[]> {
    const where = [];
    if (day) {
      const start = period ? startOfPeriod(day, period) : startOfDay(day);
      const end = endOfDay(start);
      where.push(between(tasks.date, start.toISOString(), end.toISOString()));
    }
    if (period) {
      where.push(eq(tasks.period, period));
    }

    const data = await this.db
      .select()
      .from(tasks)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(tasks.sort_order);

    return data;
  }

  async read(id: string): Promise<Task | null> {
    const data = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
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

  async create(name: string, day: Date, period: Period): Promise<Task> {
    const id = generateId();
    const currentTasks = await this.list(day);
    const date = startOfPeriod(day, period);

    const [data] = await this.db
      .insert(tasks)
      .values({
        id,
        name,
        complete: false,
        sort_order: currentTasks.length + 1,
        period,
        date: date.toISOString(),
      })
      .returning();
    this.save();

    return data;
  }

  async update({
    id,
    name,
    complete,
    sort_order,
  }: {
    id: string;
    name?: string;
    complete?: boolean;
    sort_order?: number;
  }): Promise<Task> {
    await this.checkExists(id);

    const [data] = await this.db
      .update(tasks)
      .set({
        name,
        complete,
        sort_order,
      })
      .where(eq(tasks.id, id))
      .returning();
    this.save();

    return data;
  }

  async markComplete(id: string): Promise<Task> {
    await this.checkExists(id);
    return await this.update({ id, complete: true });
  }

  async markIncomplete(id: string): Promise<Task> {
    await this.checkExists(id);
    return await this.update({ id, complete: false });
  }

  async delete(id: string) {
    const taskToBeDeleted = await this.checkExists(id);

    await this.db.delete(tasks).where(eq(tasks.id, id));

    const data = await this.list(
      new Date(taskToBeDeleted.date),
      taskToBeDeleted.period as Period
    );
    this.updateOrder(
      new Date(taskToBeDeleted.date),
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
      await this.create(task.name, day, period);
    }
    this.save();
  }

  async clearPeriod(day: Date, period: Period) {
    const start = startOfDay(day).toISOString();
    const end = endOfDay(day).toISOString();
    await this.db
      .delete(tasks)
      .where(and(between(tasks.date, start, end), eq(tasks.period, period)));
    this.save();
  }

  async updateOrder(day: Date, period: Period, orderedIds: string[]) {
    const tasks = await this.list(day, period);
    const taskIdsForDay = new Set(tasks.map((task) => task.id));

    orderedIds.forEach((id, index) => {
      if (!taskIdsForDay.has(id)) {
        throw new Error(
          `Task with id ${id} does not exist for the specified day.`
        );
      }

      this.sqlite.run("UPDATE task SET sort_order = ? WHERE id = ?", [
        index,
        id,
      ]);
    });

    this.save();
  }
}
