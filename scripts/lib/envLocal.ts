import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(scriptsDir, "../..");
const envLocalPath = join(repoRoot, ".env.local");

/** Load `.env.local` without overriding variables already set in the shell. */
export function loadEnvLocal(): void {
  if (!existsSync(envLocalPath)) return;

  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** Create or update a single key in `.env.local`, preserving other lines. */
export function upsertEnvLocal(key: string, value: string): void {
  const lines = existsSync(envLocalPath)
    ? readFileSync(envLocalPath, "utf8").split("\n")
    : ["# Local only — gitignored (.env*). Do not commit.", ""];

  let found = false;
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return line;
    const lineKey = trimmed.slice(0, eq).trim();
    if (lineKey !== key) return line;
    found = true;
    return `${key}=${value}`;
  });

  if (!found) next.push(`${key}=${value}`);

  writeFileSync(
    envLocalPath,
    next.join("\n").replace(/\n+$/, "") + "\n",
    "utf8",
  );
}

/** Remove a key from `.env.local` when cloud Postgres needs SSL (not `PGSSLMODE=disable`). */
export function removeEnvLocalKey(key: string): void {
  if (!existsSync(envLocalPath)) return;

  const lines = readFileSync(envLocalPath, "utf8").split("\n");
  const next = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return true;
    return trimmed.slice(0, eq).trim() !== key;
  });

  writeFileSync(
    envLocalPath,
    next.join("\n").replace(/\n+$/, "") + "\n",
    "utf8",
  );
}

export function envLocalExists(): boolean {
  return existsSync(envLocalPath);
}

export function envLocalPathForDisplay(): string {
  return ".env.local";
}
