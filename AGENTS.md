# FRIDAY — Agent Development Rules & Architecture

## System Architecture

FRIDAY is a personal AI assistant built with a clear separation between frontend presentation and backend intelligence/memory.

* **Frontend**: GitHub Pages / Static HTML + Vanilla JS
* **Backend**: Cloudflare Workers
* **AI Model**: Cloudflare Workers AI (`@cf/zai-org/glm-4.7-flash`)
* **Persistent Memory**: Cloudflare KV (`FRIDAY_MEMORY_KV`)
* **Knowledge Base**: Cloudflare AI Search (`friday-knowledge` / `default` namespace / `vector` retrieval)

---

## Context & Memory Classification

FRIDAY explicitly distinguishes between six distinct memory & context categories:

1. `conversation_context`: Active session chat history.
2. `short_term_context`: Temporary context needed for multi-turn interactions.
3. `persistent_memory`: Long-term user preferences, directives, and facts stored in Cloudflare KV.
4. `knowledge_base`: Authoritative documents retrieved from Cloudflare AI Search (`friday-knowledge`).
5. `external_info`: Data fetched from external APIs or search tools.
6. `tool_result`: Output returned from tool operations.

---

## Knowledge Retrieval Architecture

Knowledge search is powered by `KnowledgeService` interfacing with Cloudflare AI Search:

* **AI Search Instance**: `friday-knowledge`
* **Namespace**: `default`
* **Retrieval Type**: `vector`

### Structured Knowledge Result Format

Knowledge queries return structured results formatted as:

```json
{
  "found": true,
  "results": [
    {
      "id": "doc_01",
      "title": "Document Title",
      "content": "Document text segment",
      "score": 0.88,
      "source": "friday-knowledge"
    }
  ],
  "source": "knowledge_base",
  "confidence": 0.88,
  "query": "search phrase"
}
```

### Developer Diagnostics Endpoint

Developers can verify knowledge search availability via `/api/diagnostics`:

```json
{
  "status": "online",
  "system": "FRIDAY",
  "knowledgeDiagnostics": {
    "available": true,
    "retrievalType": "vector",
    "instance": "friday-knowledge",
    "namespace": "default",
    "lastQuery": "search phrase",
    "lastResultsCount": 1
  }
}
```

---

## Local Development & Testing

### Running Unit Tests

```bash
npm test
```

The test suite covers persistent memory operations and knowledge search retrieval, scoring, diagnostics, and failure fallback.
