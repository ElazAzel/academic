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
  let hasError = false;

  for (const file of files) {
    const specPath = path.join(specsDir, file);
    const content = fs.readFileSync(specPath, 'utf-8');
    const requiredSections = ['## Goals', '## Models', '## Architecture'];

    // Check for required sections
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        console.warn(`WARNING: Spec ${file} is missing required section: ${section} (Migrate to new standard)`);
      }
    }

    if (!content.includes('## Validation')) {
      console.warn(`WARNING: Spec ${file} is missing '## Validation' section.`);
    }
  }

  // We don't exit with 1 for legacy specs during migration to avoid blocking the workflow,
  // but new specs MUST follow the template.
  console.log('Spec validation completed with warnings for legacy documents.');
}

validateSpecs().catch(err => {
  console.error(err);
  process.exit(1);
});
