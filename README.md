# FRIDAY — Personal AI Assistant

FRIDAY is a personal AI assistant web application featuring a minimal, futuristic visual layout, persistent memory storage, and Cloudflare Worker AI integration.

## Features & Architecture

* **Frontend**: Responsive single-page web app styled with glassmorphism, HUD metrics (Calendar, Memory status, System status), and Web Speech synthesis.
* **Backend**: Cloudflare Worker handling `/api/chat` and `/api/memory` CRUD operations.
* **Persistent Memory**: Cloudflare KV (`FRIDAY_MEMORY_KV`) managed by `MemoryStore` for persistent memory creation, updates, retrieval, deletion, and keyword relevance search.
* **Context Schema**: Strictly categorizes conversation context, short-term context, persistent memories, knowledge base retrieval, external information, and tool outputs.

## Project Structure

```
├── AGENTS.md                  # Development rules and architecture guidelines
├── README.md                  # Project summary and documentation
├── index.html                 # Frontend user interface
├── package.json               # Dependencies and scripts
├── wrangler.toml              # Cloudflare Worker configuration
├── src/
│   ├── worker.ts              # Worker API routes and response composition
│   └── memory/
│       ├── types.ts           # Memory interfaces & KV bindings
│       ├── memory-store.ts    # MemoryStore class with KV persistence
│       └── index.ts           # Memory module exports
└── tests/
    └── memory-store.test.ts   # Comprehensive memory layer test suite
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

3. Deploy Cloudflare Worker:
   ```bash
   npx wrangler deploy
   ```
