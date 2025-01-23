import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

declare global {
  var _dbPool: Pool | undefined;
}

const pool =
  global._dbPool || new Pool({ connectionString: process.env.DATABASE_URL! });

if (global._dbPool) {
  global._dbPool = pool;
}

export const db = drizzle(pool);
