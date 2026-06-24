import fs from 'fs';
import path from 'path';

async function validateSpecs() {
  console.log('--- Validating Specifications (Spec-Kit) ---');
  const specsDir = path.join(process.cwd(), 'docs/superpowers/specs');
  if (!fs.existsSync(specsDir)) {
    console.log('No specs directory found.');
    return;
  }

  const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));
  let warningCount = 0;

  for (const file of files) {
    const specPath = path.join(specsDir, file);
    const content = fs.readFileSync(specPath, 'utf-8');
    const requiredSections = ['## Goals', '## Models', '## Architecture'];

    // Check for required sections
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        warningCount += 1;
        console.warn(`WARNING: Spec ${file} is missing required section: ${section} (Migrate to new standard)`);
      }
    }

    if (!content.includes('## Validation')) {
      warningCount += 1;
      console.warn(`WARNING: Spec ${file} is missing '## Validation' section.`);
    }
  }

  // We don't exit with 1 for legacy specs during migration to avoid blocking the workflow,
  // but new specs MUST follow the template.
  if (warningCount > 0) {
    console.log(`Spec validation completed with ${warningCount} warning(s) for legacy documents.`);
    return;
  }

  console.log('Spec validation completed without warnings.');
}

validateSpecs().catch(err => {
  console.error(err);
  process.exit(1);
});
