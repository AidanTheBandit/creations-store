
import { createClient } from "@libsql/client";
import "dotenv/config";

// Use same config as db/client.ts
const databaseUrl = process.env.TURSO_DATABASE_URL || "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log(`Connecting to database at ${databaseUrl}...`);

const client = createClient({
    url: databaseUrl,
    authToken: authToken,
});

async function runSQL(sql: string, description: string) {
    try {
        console.log(`Executing: ${description}...`);
        await client.execute(sql);
        console.log("  Success!");
    } catch (e: any) {
        if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
            console.log("  Skipped: Already exists.");
        } else {
            console.error("  Failed:", e.message);
        }
    }
}

async function main() {
    console.log("Starting emergency DB fix...");

    // From 0001 (ensure table exists if it was somehow skipped, though we know it likely exists)
    await runSQL(`
    CREATE TABLE IF NOT EXISTS creation_reviews (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      creation_id integer NOT NULL,
      user_id text NOT NULL,
      rating integer NOT NULL,
      comment text,
      created_at integer DEFAULT (unixepoch()) NOT NULL,
      updated_at integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY (creation_id) REFERENCES creations(id) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
    );
  `, "Create creation_reviews table");

    // From 0002 - The missing columns
    await runSQL("ALTER TABLE creations ADD proxy_code text;", "Add proxy_code column");
    await runSQL("ALTER TABLE creations ADD is_flagged integer DEFAULT false NOT NULL;", "Add is_flagged column");
    await runSQL("ALTER TABLE creations ADD flag_reason text;", "Add flag_reason column");

    await runSQL("CREATE UNIQUE INDEX IF NOT EXISTS creations_proxy_code_unique ON creations (proxy_code);", "Create proxy_code unique index");
    await runSQL("CREATE INDEX IF NOT EXISTS creations_proxy_code_idx ON creations (proxy_code);", "Create proxy_code index");

    // From 0002 - Other tables
    await runSQL(`
    CREATE TABLE IF NOT EXISTS creation_clicks (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      creation_id integer NOT NULL,
      session_id text NOT NULL,
      user_agent text,
      referrer text,
      clicked_at integer NOT NULL,
      FOREIGN KEY (creation_id) REFERENCES creations(id) ON UPDATE no action ON DELETE cascade
    );
  `, "Create creation_clicks table");

    await runSQL(`
    CREATE TABLE IF NOT EXISTS creation_daily_stats (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      creation_id integer NOT NULL,
      date text NOT NULL,
      clicks integer DEFAULT 0 NOT NULL,
      unique_clicks integer DEFAULT 0 NOT NULL,
      installs integer DEFAULT 0 NOT NULL,
      active_users integer DEFAULT 0 NOT NULL,
      FOREIGN KEY (creation_id) REFERENCES creations(id) ON UPDATE no action ON DELETE cascade
    );
  `, "Create creation_daily_stats table");

    await runSQL(`
    CREATE TABLE IF NOT EXISTS creation_installs (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      creation_id integer NOT NULL,
      session_id text NOT NULL,
      user_agent text,
      installed_at integer NOT NULL,
      FOREIGN KEY (creation_id) REFERENCES creations(id) ON UPDATE no action ON DELETE cascade
    );
  `, "Create creation_installs table");

    console.log("Done! Setup complete.");
}

main().catch(console.error);
