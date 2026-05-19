# Mem0 Docs QA Assistant

This repository contains the code for the article:

[Build a Docs QA Assistant That Remembers Technical Review Rules with Mem0](https://echessa.com/blog/build-a-docs-qa-assistant-with-mem0/)

The project is a small Node.js CLI that uses Mem0 to store technical review rules as memories, retrieves relevant rules for a Markdown draft, and uses OpenAI to return a structured docs QA report.

## What the project does

The CLI:

1. Seeds review rules into Mem0.
2. Reads a Markdown draft from disk.
3. Searches Mem0 for relevant review rules.
4. Sends the draft and retrieved rules to OpenAI.
5. Prints structured QA issues to the terminal.

## Prerequisites

You'll need:

- Node.js 18 or later
- A Mem0 Platform API key
- An OpenAI API key

## Setup

Clone the repository and install the dependencies:

```sh
git clone https://github.com/echessa/mem0-docs-qa.git
cd mem0-docs-qa
npm install
```

Rename `.env.example` to `.env` and add your mem0 and OpenAI keys:

```
MEM0_API_KEY=your_mem0_api_key
OPENAI_API_KEY=your_openai_api_key

MEM0_USER_ID=docs-reviewer
MEM0_RULESET=docs-qa-assistant

OPENAI_MODEL=gpt-5-nano
```

You can change `MEM0_USER_ID` and `MEM0_RULESET` if you want to isolate different test runs or projects.

## Seed the review rules

Run:

```sh
npm run seed
```

This reads the rules from `data/review-rules.json` and stores them in Mem0.

Running the seed command more than once can create duplicate memories. For repeated testing, either clear the old memories in Mem0 or change `MEM0_RULESET` to a new value.

## Review the example draft

Run:

```sh
npm run review -- drafts/example.md
```

The script retrieves relevant review rules from Mem0, sends them with the draft to OpenAI, and prints a JSON QA report.

## Project structure

```
mem0-docs-qa/
  data/
    review-rules.json
  drafts/
    example.md
  src/
    mem0.js
    seed-rules.js
    review-draft.js
  .env
  package.json
```

## Notes

This project is intentionally small and tutorial-focused. It calls the Mem0 Platform API directly with `fetch` instead of using the Mem0 JavaScript SDK, so the request bodies and endpoint structure remain visible. It demonstrates Mem0 concepts such as memory storage, metadata, scoped search, `infer: false`, and retrieval-augmented review workflows.
