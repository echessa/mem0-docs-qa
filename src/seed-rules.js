import { readFile } from 'node:fs/promises';
import { addRuleMemory, waitForEvent } from './mem0.js';

async function loadRules() {
  const file = new URL('../data/review-rules.json', import.meta.url);
  const json = await readFile(file, 'utf8');
  return JSON.parse(json);
}

async function main() {
  const rules = await loadRules();

  console.log(`Seeding ${rules.length} review rules into Mem0...\n`);

  for (const rule of rules) {
    const result = await addRuleMemory(rule);

    console.log(`Queued ${rule.id}: ${result.status}`);

    if (result.event_id && result.status === 'PENDING') {
      await waitForEvent(result.event_id);
    }

    if (result.status === 'FAILED') {
      throw new Error(`Failed to store ${rule.id}`);
    }

    console.log(`Stored ${rule.id}\n`);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
