#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "mukul975/Anthropic-Cybersecurity-Skills";
const REF = "v1.2.0";
const SKILLS = [
  "analyzing-sbom-for-supply-chain-vulnerabilities",
  "detecting-supply-chain-attacks-in-ci-cd",
  "implementing-devsecops-security-scanning",
  "implementing-secrets-scanning-in-ci-cd",
  "integrating-sast-into-github-actions-pipeline",
  "performing-container-security-scanning-with-trivy",
  "performing-csrf-attack-simulation",
  "performing-security-headers-audit",
  "performing-threat-modeling-with-owasp-threat-dragon",
  "performing-web-application-vulnerability-triage",
  "testing-api-authentication-weaknesses",
  "testing-api-for-broken-object-level-authorization",
  "testing-for-broken-access-control",
  "testing-for-sensitive-data-exposure",
  "testing-for-xss-vulnerabilities",
];

const root = process.cwd();
const lockPath = join(root, "skills-lock.json");

if (!existsSync(lockPath)) {
  console.error("[security-skills] skills-lock.json не найден.");
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const errors = [];

for (const name of SKILLS) {
  const entry = lock.skills?.[name];
  const skillFile = join(root, ".agents", "skills", name, "SKILL.md");

  if (!entry) {
    errors.push(`${name}: отсутствует в skills-lock.json`);
    continue;
  }

  if (entry.source !== SOURCE || entry.ref !== REF || entry.sourceType !== "github") {
    errors.push(`${name}: источник должен быть ${SOURCE}@${REF}`);
  }

  if (entry.skillPath !== `skills/${name}/SKILL.md`) {
    errors.push(`${name}: неожиданный skillPath ${entry.skillPath ?? "<missing>"}`);
  }

  if (!/^[a-f0-9]{64}$/.test(entry.computedHash ?? "")) {
    errors.push(`${name}: отсутствует корректный computedHash`);
  }

  if (!existsSync(skillFile)) {
    errors.push(`${name}: файл .agents/skills/${name}/SKILL.md не найден`);
  }
}

const unexpected = Object.entries(lock.skills ?? {})
  .filter(([, entry]) => entry.source === SOURCE)
  .map(([name]) => name)
  .filter((name) => !SKILLS.includes(name));

if (unexpected.length > 0) {
  errors.push(`неразрешённые навыки из ${SOURCE}: ${unexpected.join(", ")}`);
}

if (errors.length > 0) {
  console.error("[security-skills] Проверка не пройдена:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[security-skills] OK: ${SKILLS.length} навыков закреплены на ${SOURCE}@${REF}`);
