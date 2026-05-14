import { existsSync, rmSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const workspace = process.cwd();
const target = resolve(workspace, ".next", "dev");
const relativeTarget = relative(workspace, target);

if (relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
  throw new Error(`Refusing to remove path outside workspace: ${target}`);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}
