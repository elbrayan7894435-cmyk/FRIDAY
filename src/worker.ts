import { MemoryStore } from './memory';
import { MinimalKVNamespace } from './memory/types';
import { KnowledgeService } from './knowledge';
import { FridayOrchestrator } from './orchestrator';

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

    // Fallback in-memory KV
    const memoryKv: MinimalKVNamespace = env.FRIDAY_MEMORY_KV || createInMemoryKV();
    const memoryStore = new MemoryStore(memoryKv);

    // Knowledge service
    const knowledgeProvider = env.AI_SEARCH || createMockAISearchProvider();
    const knowledgeService = new KnowledgeService(knowledgeProvider, {
      instance: 'friday-knowledge',
      namespace: 'default',
      retrievalType: 'vector',
    });

    // Orchestrator initialization with Workers AI binding env.AI
    const orchestrator = new FridayOrchestrator(memoryStore, knowledgeService, env.AI);

    try {
      // Diagnostics Endpoint for Developers
      if (path === '/api/diagnostics') {
        const diagnostics = knowledgeService.getDiagnostics();
        const toolsList = orchestrator.toolRegistry.listTools().map((t) => ({
          name: t.name,
          description: t.description,
          permissionLevel: t.permissionLevel,
        }));

        return new Response(
          JSON.stringify({
            status: 'online',
            system: 'FRIDAY',
            knowledgeDiagnostics: diagnostics,
            registeredTools: toolsList,
            auditCount: orchestrator.toolRegistry.getAuditLogs().length,
            timestamp: new Date().toISOString(),
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Memory CRUD Endpoints
      if (path === '/api/memory' || path.startsWith('/api/memory/')) {
        return await handleMemoryEndpoints(request, path, memoryStore, corsHeaders);
      }

      // Main AI Assistant Route through Orchestration Pipeline
      if (path === '/api/chat' || path === '/') {
        if (request.method !== 'POST') {
          return new Response(
            JSON.stringify({ response: 'FRIDAY orchestrator active.', status: 'online' }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const body = (await request.json().catch(() => ({}))) as any;
        const userMessage = body.message || body.prompt || '';
        const confirmedByUser = body.confirmedByUser === true;

        if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
          return new Response(
            JSON.stringify({
              error: 'Message payload required.',
              response: 'Please provide a valid message.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Orchestrator processing pipeline: Analysis -> Context -> Tool Execution -> Response
        const orchestratorResult = await orchestrator.processRequest(userMessage, {
          confirmedByUser,
        });

        const reply = orchestratorResult.response || 'FRIDAY active. Processed query with no output text.';

        return new Response(
          JSON.stringify({
            response: reply,
            category: orchestratorResult.category,
            toolsExecuted: orchestratorResult.toolsExecuted,
            requiresConfirmation: orchestratorResult.requiresConfirmation,
            pendingToolCall: orchestratorResult.pendingToolCall,
            auditTrail: orchestratorResult.auditTrail,
            contextSummary: orchestratorResult.contextSummary,
            memoryUsed: orchestratorResult.contextSummary.memoryUsed,
            knowledgeUsed: orchestratorResult.contextSummary.knowledgeUsed,
            status: 'online',
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Endpoint not found', response: 'Route not found.' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (err: any) {
      console.error('Worker top-level exception:', err);
      const errorMessage = err.message || 'Internal Server Error';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          response: `Internal error: ${errorMessage}`,
          status: 'error',
        }),
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
