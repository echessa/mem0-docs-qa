import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';
import { searchRuleMemories } from './mem0.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function requireArg(value, message) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function uniqueMemories(results) {
  const seen = new Set();
  const unique = [];

  for (const result of results) {
    const key = result.id || result.memory;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(result);
    }
  }

  return unique;
}

function formatMemories(memories) {
  return memories
    .map((memory, index) => {
      const metadata = memory.metadata || {};

      return [
        `Rule ${index + 1}`,
        `Memory ID: ${memory.id || 'unknown'}`,
        `Rule ID: ${metadata.rule_id || 'unknown'}`,
        `Rule type: ${metadata.rule_type || 'unknown'}`,
        `Severity: ${metadata.severity || 'unknown'}`,
        `Memory: ${memory.memory}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

async function retrieveRelevantRules(draft) {
  const preview = draft.slice(0, 4000);

  const queries = [
    `Technical terminology, product names, and API names to check in this draft:\n${preview}`,
    `Mem0 API gotchas, search filters, metadata, inference behavior, and entity scoping rules relevant to this draft.`,
    `Code review rules for environment variables, setup instructions, and code examples relevant to this draft.`,
  ];

  const batches = await Promise.all(
    queries.map((query) =>
      searchRuleMemories(query, {
        topK: 8,
        threshold: 0.0,
        rerank: true,
      }),
    ),
  );

  return uniqueMemories(batches.flat());
}

async function reviewDraft(draft, memories) {
  const rules = formatMemories(memories);

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL,
    instructions: `
You are a technical documentation QA reviewer.

Inspect the draft against the retrieved review rules.
Do not rewrite the draft. Only report issues that violate the retrieved rules.

Return valid JSON only, with this shape:

{
  "summary": "One sentence summary.",
  "issues": [
    {
      "ruleId": "rule id from memory metadata, if available",
      "severity": "low | medium | high",
      "quote": "exact quote from the draft, if available",
      "problem": "what is wrong",
      "suggestion": "specific correction"
    }
  ]
}

Rules:
- Only flag issues supported by the retrieved rules.
- If the draft does not violate a rule, do not mention that rule.
- Do not invent product facts that are not in the retrieved rules.
- Keep suggestions concise and actionable.
    `.trim(),
    input: `
Retrieved review rules from Mem0:

${rules}

Draft to review:

${draft}
    `.trim(),
  });

  return response.output_text;
}

async function main() {
  const draftPath = requireArg(
    process.argv[2],
    'Usage: npm run review -- drafts/example.md',
  );

  const draft = await readFile(draftPath, 'utf8');
  const memories = await retrieveRelevantRules(draft);

  if (memories.length === 0) {
    console.log('No relevant review rules found in Mem0.');
    return;
  }

  console.log(`Retrieved ${memories.length} relevant rules from Mem0.\n`);

  const report = await reviewDraft(draft, memories);

  console.log(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
