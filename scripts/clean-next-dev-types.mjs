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

// Next.js 16 uses proxy.ts instead of middleware.ts.
// If both exist, the build fails. Remove middleware.ts if proxy.ts is present.
const proxyPath = resolve(workspace, "proxy.ts");
const middlewarePath = resolve(workspace, "middleware.ts");
if (existsSync(proxyPath) && existsSync(middlewarePath)) {
  rmSync(middlewarePath, { force: true });
  console.log("[clean] Removed middleware.ts (Next.js 16 uses proxy.ts)");
}

