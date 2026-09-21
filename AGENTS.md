# FRIDAY — Agent Development Rules & Architecture

## System Architecture

FRIDAY is a personal AI assistant built with a clear separation between frontend presentation and backend intelligence/memory.

* **Frontend**: GitHub Pages / Static HTML + Vanilla JS
* **Backend**: Cloudflare Workers
* **AI Model**: Cloudflare Workers AI (`@cf/zai-org/glm-4.7-flash`)
* **Persistent Memory**: Cloudflare KV (`FRIDAY_MEMORY_KV`)
* **Knowledge Base**: Cloudflare AI Search (`friday-knowledge` / `default` namespace)

---

## Persistent Memory Layer Architecture

FRIDAY explicitly distinguishes between six distinct memory & context categories:

1. `conversation_context`: Active session chat history.
2. `short_term_context`: Temporary context needed for multi-turn interactions.
3. `persistent_memory`: Long-term user preferences, directives, and facts stored in Cloudflare KV.
4. `knowledge_base`: Authoritative documents retrieved from Cloudflare AI Search.
5. `external_info`: Data fetched from external APIs or search tools.
6. `tool_result`: Output returned from tool operations.

### Memory Schema

Each persistent memory record includes:

* `id`: Unique identifier (string).
* `content`: Memory narrative payload.
* `category`: One of the 6 explicit memory categories above.
* `confidence`: Float between `0.0` and `1.0`.
* `source`: Provenance of memory (e.g. `user_directive`, `extracted_fact`).
* `tags`: Array of string keywords for term search.
* `createdAt`: ISO 8601 string timestamp.
* `updatedAt`: ISO 8601 string timestamp.
* `metadata`: Optional JSON key-value store.

### Guiding Directives for Memory

* FRIDAY must never invent or assume memories.
* Persistent memory operations (create, update, delete) must be explicit and safe.
* When persistent memory is used during inference, backend responses flag `memoryUsed: true` without cluttering the UI with raw internal data structures.

---

## Local Development & Testing

### Running Memory Layer Tests

```bash
npm install
npm test
```

The test suite covers:
* Memory creation (`saveMemory`)
* Memory retrieval (`getMemory`)
* Memory updates (`updateMemory`)
* Memory deletion (`deleteMemory`)
* Missing memory handling
* Malformed memory JSON/schema parsing
* Duplicate memory collision prevention
* KV storage failure handling
