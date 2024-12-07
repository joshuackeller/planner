import type { Client as TursoClient } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

declare global {
  var _tursoClient: TursoClient | undefined;
  var _dbInstance: LibSQLDatabase | undefined;
}
