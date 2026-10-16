import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const SOURCE_DIRS = ["app", "server", "lib"];

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe("Prisma JSON filters", () => {
  it("используют PostgreSQL-синтаксис path: string[], а не MySQL-строку $.key", () => {
    const offenders = SOURCE_DIRS.flatMap((dir) => listSourceFiles(path.join(root, dir)))
      .filter((file) => /path:\s*["'`]\$\./.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });
});
