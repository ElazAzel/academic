import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LOCK_SQL_FILES = [
  "server/modules/quizzes/service.ts",
  "server/modules/progress/service.ts",
  "server/modules/assignments/service.ts",
];

describe("enrollment lock SQL", () => {
  it.each(LOCK_SQL_FILES)("uses the mapped enrollments table in %s", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");

    expect(source).toContain('FROM "enrollments"');
    expect(source).not.toContain('FROM "enrollment"');
  });
});
