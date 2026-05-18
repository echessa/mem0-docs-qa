import 'dotenv/config';

const MEM0_BASE_URL = 'https://api.mem0.ai';

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const scopes = {
  userId: requiredEnv('MEM0_USER_ID'),
  ruleset: requiredEnv('MEM0_RULESET'),
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mem0Fetch(path, options = {}) {
  const response = await fetch(`${MEM0_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Token ${requiredEnv('MEM0_API_KEY')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const raw = await response.text();

  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    throw new Error(
      `Mem0 API error ${response.status}: ${JSON.stringify(data, null, 2)}`,
    );
  }

  return data;
}

function formatRule(rule) {
  return [
    `Rule ID: ${rule.id}`,
    `Rule type: ${rule.type}`,
    `Product: ${rule.product}`,
    `Severity: ${rule.severity}`,
    `Rule: ${rule.rule}`,
    rule.bad ? `Bad example: ${rule.bad}` : null,
    rule.good ? `Good example: ${rule.good}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function addRuleMemory(rule) {
  return mem0Fetch('/v3/memories/add/', {
    method: 'POST',
    body: {
      messages: [
        {
          role: 'user',
          content: formatRule(rule),
        },
      ],
      user_id: scopes.userId,
      metadata: {
        source: 'docs-qa-seed',
        ruleset: scopes.ruleset,
        rule_id: rule.id,
        rule_type: rule.type,
        product: rule.product,
        severity: rule.severity,
      },
      infer: false,
    },
  });
}

export async function waitForEvent(eventId, options = {}) {
  const maxAttempts = options.maxAttempts || 20;
  const intervalMs = options.intervalMs || 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const event = await mem0Fetch(`/v1/event/${eventId}/`);

    if (event.status === 'SUCCEEDED') {
      return event;
    }

    if (event.status === 'FAILED') {
      throw new Error(`Mem0 event failed: ${JSON.stringify(event, null, 2)}`);
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for Mem0 event ${eventId}`);
}

export async function searchRuleMemories(query, options = {}) {
  const ruleTypes = options.ruleTypes || [];

  const filters = {
    AND: [
      { user_id: scopes.userId },
      { metadata: { ruleset: scopes.ruleset } },
    ],
  };

  if (ruleTypes.length > 0) {
    filters.AND.push({
      OR: ruleTypes.map((ruleType) => ({
        metadata: { rule_type: ruleType },
      })),
    });
  }

  const response = await mem0Fetch('/v3/memories/search/', {
    method: 'POST',
    body: {
      query,
      filters,
      top_k: options.topK || 12,
      threshold: options.threshold ?? 0.0,
      rerank: options.rerank ?? true,
    },
  });

  return response.results || [];
}
