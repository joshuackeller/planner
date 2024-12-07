import { drizzle } from "drizzle-orm/libsql";
import { Client, createClient } from "@libsql/client";

let tursoClient: Client;
let dbInstance;

if (!globalThis._tursoClient) {
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  globalThis._tursoClient = tursoClient; // Store in global object
} else {
  tursoClient = globalThis._tursoClient;
}

if (!globalThis._dbInstance) {
  dbInstance = drizzle(tursoClient);
  globalThis._dbInstance = dbInstance; // Store in global object
} else {
  dbInstance = globalThis._dbInstance;
}

export const db = dbInstance;
