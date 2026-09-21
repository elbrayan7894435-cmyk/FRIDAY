# FRIDAY — Personal AI Assistant

FRIDAY is a personal AI assistant web application featuring a minimal visual layout, persistent memory storage, structured knowledge retrieval, and Cloudflare Worker AI integration.

## Features & Architecture

* **Frontend**: Single-page web app styled with HUD metrics (Calendar, Memory status, System status) and Web Speech synthesis.
* **Backend**: Cloudflare Worker handling `/api/chat`, `/api/memory` CRUD, and `/api/diagnostics`.
* **Persistent Memory**: Managed by `MemoryStore` backed by Cloudflare KV (`FRIDAY_MEMORY_KV`).
* **Knowledge Retrieval**: Managed by `KnowledgeService` backed by Cloudflare AI Search (`friday-knowledge` instance, `default` namespace, `vector` retrieval type).

## Project Structure

```
├── AGENTS.md                  # Development rules and architecture guidelines
├── README.md                  # Project summary and documentation
├── index.html                 # Frontend user interface
├── package.json               # Dependencies and scripts
├── wrangler.toml              # Cloudflare Worker configuration
├── src/
│   ├── worker.ts              # Worker API routes and response composition
│   ├── memory/                # Persistent memory store
│   └── knowledge/             # AI Search knowledge service & diagnostics
└── tests/
    ├── memory-store.test.ts   # Memory layer test suite
    └── knowledge-service.test.ts # Knowledge retrieval test suite
```

## Setup & Running Tests

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run test suite:
   ```bash
   npm test
   ```
