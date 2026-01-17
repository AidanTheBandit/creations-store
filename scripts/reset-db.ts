import { createClient } from "@libsql/client";
import "dotenv/config";

const databaseUrl = process.env.TURSO_DATABASE_URL || "file:./local.db";
const turso = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function resetDatabase() {
  console.log("🗑️  Resetting database...");
  
  try {
    // Drop all tables
    await turso.execute("DROP TABLE IF EXISTS creation_views");
    await turso.execute("DROP TABLE IF EXISTS creation_screenshots");
    await turso.execute("DROP TABLE IF EXISTS creations");
    await turso.execute("DROP TABLE IF EXISTS sessions");
    await turso.execute("DROP TABLE IF EXISTS categories");
    await turso.execute("DROP TABLE IF EXISTS users");
    
    console.log("✅ Database reset complete!");
  } catch (error) {
    console.error("Error resetting database:", error);
  }
}

resetDatabase().then(() => process.exit(0)).catch(() => process.exit(1));