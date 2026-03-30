/**
 * Applies supabase/migrations to the remote database.
 * Set DATABASE_URL (Session or Transaction pooler URI from Supabase Dashboard → Database).
 * You may add DATABASE_URL to .env.local (not committed); special chars in the password must be URL-encoded.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fromFile = loadEnvLocal();
const dbUrl = process.env.DATABASE_URL || fromFile.DATABASE_URL;

if (!dbUrl) {
  console.error(
    "Missing DATABASE_URL. Add it to .env.local or export it, then run: npm run db:push\n" +
      "Supabase → Project Settings → Database → copy the URI (replace [YOUR-PASSWORD])."
  );
  process.exit(1);
}

const r = spawnSync("npx", ["supabase", "db", "push", "--yes", "--db-url", dbUrl], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
process.exit(r.status === null ? 1 : r.status);
