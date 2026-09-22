import { describe, expect, it, beforeEach } from 'vitest';
import worker, { Env } from '../src/worker';

class MockAIProvider {
  public shouldFail = false;
  public mockText = 'Hello! I am FRIDAY, your personal AI assistant.';

  async run(model: string, options: any): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Cloudflare Workers AI engine overloaded');
    }
    return { response: this.mockText };
  }
}

class MockKV {
  public store = new Map<string, string>();
  async get(key: string) { return this.store.get(key) || null; }
  async put(key: string, value: string) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
  async list(options?: any) {
    const keys = Array.from(this.store.keys()).map((name) => ({ name }));
    return { keys, list_complete: true };
  }
}

describe('Worker & Pipeline End-to-End Integration Tests', () => {
  let mockAI: MockAIProvider;
  let mockKV: MockKV;
  let env: Env;

  beforeEach(() => {
    mockAI = new MockAIProvider();
    mockKV = new MockKV();
    env = {
      AI: mockAI,
      FRIDAY_MEMORY_KV: mockKV as any,
    };
  });

  it('1. Handles normal conversational message and returns valid JSON response contract', async () => {
    const request = new Request('https://friday-ai.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Good morning FRIDAY' }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.response).not.toBe('');
    expect(data.response).toContain('FRIDAY');
    expect(data.category).toBe('conversational');
    expect(data.status).toBe('online');
  });

  it('2. Handles knowledge question and incorporates knowledge context', async () => {
    const request = new Request('https://friday-ai.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the system architecture?' }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.response).not.toBe('');
    expect(data.knowledgeUsed).toBe(true);
    expect(data.category).toBe('knowledge');
  });

  it('3. Handles memory query and incorporates persistent memory context', async () => {
    // Save memory first
    await mockKV.put(
      'memory:mem_pref_01',
      JSON.stringify({
        id: 'mem_pref_01',
        content: 'User prefers concise technical responses',
        category: 'persistent_memory',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    const request = new Request('https://friday-ai.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Remember user prefers concise technical responses' }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.response).not.toBe('');
    expect(data.memoryUsed).toBe(true);
  });

  it('4. Handles empty/invalid input safely with structured 400 error response', async () => {
    const request = new Request('https://friday-ai.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Message payload required.');
    expect(data.response).toBe('Please provide a valid message.');
  });

  it('5. Handles AI failure gracefully without returning empty text string', async () => {
    mockAI.shouldFail = true;

    const request = new Request('https://friday-ai.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.response).not.toBe('');
    expect(data.response).not.toBe('I received an empty response.');
  });

  it('6. Handles top-level worker exception safely with structured error response', async () => {
    const badEnv: Env = {
      AI: {
        run: () => {
          throw new Error('Fatal engine crash');
        },
      },
    };

    const request = new Request('https://friday-ai.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });

    const response = await worker.fetch(request, badEnv);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.response).not.toBe('');
  });

  it('7. Verifies complete Worker JSON response contract', async () => {
    const request = new Request('https://friday-ai.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is FRIDAY?' }),
    });

    const response = await worker.fetch(request, env);
    const data = await response.json();

    expect(data).toHaveProperty('response');
    expect(data).toHaveProperty('category');
    expect(data).toHaveProperty('toolsExecuted');
    expect(data).toHaveProperty('requiresConfirmation');
    expect(data).toHaveProperty('auditTrail');
    expect(data).toHaveProperty('contextSummary');
    expect(data).toHaveProperty('status', 'online');
  });
});
