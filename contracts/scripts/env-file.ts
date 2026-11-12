import * as fs from "fs";
import * as path from "path";

/** The backend's git-ignored env file: the single place the service wallet and chain settings live. */
export const ENV_FILE = path.join(__dirname, "..", "..", "backend", ".env.local");

export function readEnvFile(): string {
  return fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
}

/** Sets KEY=value in the env file (replacing an existing line, otherwise appending). */
export function upsertEnv(key: string, value: string): void {
  const text = readEnvFile();
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  const next = re.test(text) ? text.replace(re, line) : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
  fs.writeFileSync(ENV_FILE, next);
}

export function getEnvValue(key: string): string | undefined {
  const m = new RegExp(`^${key}=(.*)$`, "m").exec(readEnvFile());
  return m ? m[1].trim() : undefined;
}
