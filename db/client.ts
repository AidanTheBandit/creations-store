import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import "dotenv/config";

// Use local SQLite for development, fallback to Turso for production
const databaseUrl = process.env.TURSO_DATABASE_URL || "file:./local.db";

// For local development, TURSO_AUTH_TOKEN can be empty
const turso = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export const db = drizzle(turso, { schema });
