# FRIDAY — Agent Development Rules & Architecture

## System Architecture & Core Orchestration Pipeline

FRIDAY operates as a modular personal AI operating layer built with a strict separation between presentation, orchestration, memory, knowledge retrieval, and tool execution.

```
user message
→ request analysis (RequestRouter)
→ context gathering (ContextManager)
→ tool selection & permission check (ToolRegistry)
→ tool execution
→ result validation
→ response generation (ResponseGenerator)
```

---

## Request Categorization

The orchestrator explicitly categorizes incoming requests into:

1. `conversational`: General chat exchanges.
2. `knowledge`: Questions matching knowledge base retrieval patterns.
3. `memory`: Requests to store, update, or recall persistent facts/preferences.
4. `web_research`: External web search requests.
5. `tool_request`: Direct invocations of registered tools.
6. `multi_step`: Multi-turn sequential tasks.
7. `unsupported`: Safety or capability boundary violations.

---

## Tool Registry & Security Rules

* Every tool must define:
  * `name`
  * `description`
  * `inputSchema`
  * `permissionLevel` (`normal` or `high_impact`)
  * `execute` function
* High-impact tools (`permissionLevel: "high_impact"`) require explicit user confirmation (`confirmedByUser: true`) before execution.
* The orchestrator records a complete `auditTrail` for all tool execution attempts.
* FRIDAY never claims a tool succeeded unless the tool actually returned a verified success result.

---

## Context & Memory Classification

FRIDAY explicitly distinguishes between six distinct context categories:

1. `conversation_context`: Active session chat history.
2. `short_term_context`: Temporary context needed for multi-turn interactions.
3. `persistent_memory`: Long-term user preferences, directives, and facts stored in Cloudflare KV.
4. `knowledge_base`: Authoritative documents retrieved from Cloudflare AI Search (`friday-knowledge`).
5. `external_info`: Data fetched from external APIs or search tools.
6. `tool_result`: Output returned from tool operations.

---

## Local Development & Testing

```bash
npm install
npm test
```

The test suite covers:
* Persistent memory CRUD and edge case parsing (`tests/memory-store.test.ts`)
* Vector knowledge retrieval and developer diagnostics (`tests/knowledge-service.test.ts`)
* Request analysis, tool permissions, input schema validation, and audit logging (`tests/orchestrator.test.ts`)
