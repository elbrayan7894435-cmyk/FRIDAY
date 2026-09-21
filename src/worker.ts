import { MemoryStore } from './memory';
import { MinimalKVNamespace } from './memory/types';
import { KnowledgeService } from './knowledge';

export interface Env {
  FRIDAY_MEMORY_KV?: MinimalKVNamespace;
  AI?: any;
  AI_SEARCH?: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Fallback in-memory KV if binding is missing in local/demo environment
    const memoryKv: MinimalKVNamespace = env.FRIDAY_MEMORY_KV || createInMemoryKV();
    const memoryStore = new MemoryStore(memoryKv);

    // Knowledge service initialization using Cloudflare AI Search instance 'friday-knowledge' and namespace 'default'
    const knowledgeProvider = env.AI_SEARCH || createMockAISearchProvider();
    const knowledgeService = new KnowledgeService(knowledgeProvider, {
      instance: 'friday-knowledge',
      namespace: 'default',
      retrievalType: 'vector',
    });

    try {
      // Diagnostics Endpoint for Developers
      if (path === '/api/diagnostics') {
        const diagnostics = knowledgeService.getDiagnostics();
        return new Response(
          JSON.stringify({
            status: 'online',
            system: 'FRIDAY',
            knowledgeDiagnostics: diagnostics,
            timestamp: new Date().toISOString(),
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Memory CRUD Endpoints
      if (path === '/api/memory' || path.startsWith('/api/memory/')) {
        return await handleMemoryEndpoints(request, path, memoryStore, corsHeaders);
      }

      // Main AI Assistant Route
      if (path === '/api/chat' || path === '/') {
        if (request.method !== 'POST') {
          return new Response(
            JSON.stringify({ response: 'FRIDAY system active.', status: 'online' }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const body = (await request.json().catch(() => ({}))) as any;
        const userMessage = body.message || body.prompt || '';

        if (!userMessage) {
          return new Response(
            JSON.stringify({ error: 'Message payload required.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // 1. Retrieve relevant persistent memories
        const relevantMemories = await memoryStore.searchRelevantMemories(userMessage, {
          category: 'persistent_memory',
          minConfidence: 0.4,
          limit: 5,
        });

        const memoryUsed = relevantMemories.length > 0;
        const memorySources = relevantMemories.map((m) => m.memory.source);

        // 2. Perform Knowledge Retrieval
        const knowledgeResult = await knowledgeService.search(userMessage);

        // Build context explicit categories summary
        const contextSummary = {
          conversationContext: 'Active session chat history',
          persistentMemoriesCount: relevantMemories.length,
          knowledgeBaseUsed: knowledgeResult.found,
          knowledgeResultCount: knowledgeResult.results.length,
          externalInfoUsed: false,
          toolResultsUsed: false,
        };

        let responseText = `I have received your query: "${userMessage}".`;

        if (memoryUsed) {
          const memoryContent = relevantMemories.map((m) => `- ${m.memory.content}`).join('\n');
          responseText += `\n\n[Persistent Memory Context Applied]:\n${memoryContent}`;
        }

        if (knowledgeResult.found) {
          const kbContent = knowledgeResult.results.map((r) => `- ${r.title ? r.title + ': ' : ''}${r.content}`).join('\n');
          responseText += `\n\n[Knowledge Base Context Applied]:\n${kbContent}`;
        }

        return new Response(
          JSON.stringify({
            response: responseText,
            memoryUsed,
            memoryCount: relevantMemories.length,
            memorySources,
            knowledgeUsed: knowledgeResult.found,
            knowledgeCount: knowledgeResult.results.length,
            knowledgeConfidence: knowledgeResult.confidence,
            contextSummary,
            status: 'online',
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message || 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  },
};

async function handleMemoryEndpoints(
  request: Request,
  path: string,
  memoryStore: MemoryStore,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const method = request.method;

  if (path === '/api/memory' && method === 'GET') {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') as any;
    const memories = await memoryStore.listMemories({ category: category || undefined });
    return new Response(JSON.stringify({ memories }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (path === '/api/memory' && method === 'POST') {
    const input = await request.json();
    const memory = await memoryStore.saveMemory(input);
    return new Response(JSON.stringify({ success: true, memory }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (path.startsWith('/api/memory/') && method === 'PUT') {
    const id = path.replace('/api/memory/', '');
    const updates = await request.json();
    const memory = await memoryStore.updateMemory(id, updates);
    return new Response(JSON.stringify({ success: true, memory }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (path.startsWith('/api/memory/') && method === 'DELETE') {
    const id = path.replace('/api/memory/', '');
    const deleted = await memoryStore.deleteMemory(id);
    return new Response(JSON.stringify({ success: deleted }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed on /api/memory' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function createInMemoryKV(): MinimalKVNamespace {
  const map = new Map<string, string>();
  return {
    async get(key: string) {
      return map.get(key) || null;
    },
    async put(key: string, value: string) {
      map.set(key, value);
    },
    async delete(key: string) {
      map.delete(key);
    },
    async list(options?: { prefix?: string }) {
      const prefix = options?.prefix || '';
      const keys = Array.from(map.keys())
        .filter((k) => k.startsWith(prefix))
        .map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

function createMockAISearchProvider() {
  return {
    async search(query: string) {
      if (query.toLowerCase().includes('architecture') || query.toLowerCase().includes('friday')) {
        return {
          results: [
            {
              id: 'doc_01',
              title: 'FRIDAY System Architecture Overview',
              content: 'FRIDAY is a personal AI operating layer with persistent memory, Cloudflare Workers backend, and vector knowledge search.',
              score: 0.88,
            },
          ],
        };
      }
      return { results: [] };
    },
  };
}
