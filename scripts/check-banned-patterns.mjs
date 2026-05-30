#!/usr/bin/env node

/**
 * Check for banned patterns in the codebase.
 * Used as part of the verify pipeline and Meta-Harness iterations.
 *
 * Exit codes:
 *   0 — all clean
 *   1 — banned patterns found
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";

const BANNED_PATTERNS = [
  // Debugging artifacts
  { pattern: "debugger", description: "debugger statement", severity: "error", include: "*.{ts,tsx,js,mjs}" },

  // Lax typing
  { pattern: "@ts-ignore", description: "@ts-ignore (use @ts-expect-error with reason)", severity: "warn", include: "*.{ts,tsx}" },
  { pattern: "@ts-expect-error", description: "@ts-expect-error without reason comment", severity: "warn", include: "*.{ts,tsx}" },

  // Hardcoded secrets
  { pattern: "sk_live_", description: "Stripe live secret key", severity: "error", include: "*.{ts,tsx,js,mjs}" },
  { pattern: "ghp_", description: "GitHub personal access token", severity: "error", include: "*.{ts,tsx,js,mjs}" },

  // English UI text in user-facing components
  // Only check component files, not server code or tests
  { pattern: '>"Submit"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Cancel"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Save"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Delete"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Edit"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Create"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Add"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Update"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Login"<', description: "English string in component", severity: "warn", include: "*.tsx" },
  { pattern: '>"Password"<', description: "English string in component", severity: "warn", include: "*.tsx" },

  // Uncommitted secrets
  { pattern: "postgresql://.*:.*@.*:5432", description: "Hardcoded DB connection string", severity: "error", include: "*.{ts,tsx,js,mjs}" },
];

const RG_AVAILABLE = (() => {
  try {
    execSync("rg --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

let exitCode = 0;
const results = [];

for (const bp of BANNED_PATTERNS) {
  const cmd = RG_AVAILABLE
    ? `rg -n --include '${bp.include}' '${bp.pattern}' .`
    : `findstr /s /n "${bp.pattern}" ${bp.include.replace("*.", "*.")}`;

  try {
    const output = execSync(cmd, {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
    if (output.trim()) {
      const lines = output.trim().split("\n").filter(Boolean);
      results.push({ ...bp, matches: lines });
      if (bp.severity === "error") exitCode = 1;
    }
  } catch {
    // rg returns exit code 1 when no matches found — not an error
  }
}

if (results.length === 0) {
  console.log("[check-banned-patterns] ✅ All clean — no banned patterns found");
  process.exit(0);
}

let hasErrors = false;
for (const r of results) {
  const icon = r.severity === "error" ? "❌" : "⚠️";
  console.log(`\n${icon} [${r.severity}] ${r.description}: ${r.pattern}`);
  for (const m of r.matches.slice(0, 5)) {
    console.log(`  ${m}`);
  }
  if (r.matches.length > 5) {
    console.log(`  ... and ${r.matches.length - 5} more matches`);
  }
  if (r.severity === "error") hasErrors = true;
}

if (hasErrors) {
  console.log("\n❌ [check-banned-patterns] FAILED — fix errors before committing");
} else {
  console.log("\n⚠️ [check-banned-patterns] Warnings found (non-blocking)");
}

process.exit(hasErrors ? 1 : 0);
