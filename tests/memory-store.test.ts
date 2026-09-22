import { describe, expect, it, beforeEach } from 'vitest';
import { MemoryStore } from '../src/memory/memory-store';
import { MinimalKVNamespace } from '../src/memory/types';

class MockKV implements MinimalKVNamespace {
  public store = new Map<string, string>();
  public shouldFailGet = false;

  async get(key: string): Promise<any> {
    if (this.shouldFailGet) {
      throw new Error('KV storage operation failed.');
    }
    return this.store.get(key) || null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }>; list_complete: boolean }> {
    const prefix = options?.prefix || '';
    const keys = Array.from(this.store.keys())
      .filter((k) => k.startsWith(prefix))
      .map((name) => ({ name }));
    return { keys, list_complete: true };
  }
}

describe('MemoryStore - Persistent Memory Architecture', () => {
  let mockKV: MockKV;
  let memoryStore: MemoryStore;

  beforeEach(() => {
    mockKV = new MockKV();
    memoryStore = new MemoryStore(mockKV);
  });

  it('saves a memory successfully with metadata and timestamps', async () => {
    const memory = await memoryStore.saveMemory({
      id: 'user_pref_01',
      content: 'User prefers concise technical responses.',
      category: 'persistent_memory',
      confidence: 0.95,
      source: 'user_directive',
      tags: ['preference', 'communication'],
    });

    expect(memory.id).toBe('user_pref_01');
    expect(memory.content).toBe('User prefers concise technical responses.');
    expect(memory.category).toBe('persistent_memory');
    expect(memory.confidence).toBe(0.95);
    expect(memory.source).toBe('user_directive');
    expect(memory.createdAt).toBeDefined();
    expect(memory.updatedAt).toBeDefined();
  });

  it('retrieves an existing memory by ID', async () => {
    await memoryStore.saveMemory({
      id: 'mem_ret_01',
      content: 'FRIDAY assistant system name confirmed.',
      category: 'persistent_memory',
    });

    const retrieved = await memoryStore.getMemory('mem_ret_01');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('mem_ret_01');
    expect(retrieved?.content).toBe('FRIDAY assistant system name confirmed.');
  });

  it('updates an existing memory correctly', async () => {
    await memoryStore.saveMemory({
      id: 'mem_upd_01',
      content: 'Initial memory state',
      category: 'persistent_memory',
    });

    const updated = await memoryStore.updateMemory('mem_upd_01', {
      content: 'Updated memory content',
      confidence: 0.9,
    });

    expect(updated.content).toBe('Updated memory content');
    expect(updated.confidence).toBe(0.9);

    const fetched = await memoryStore.getMemory('mem_upd_01');
    expect(fetched?.content).toBe('Updated memory content');
  });

  it('deletes an existing memory', async () => {
    await memoryStore.saveMemory({
      id: 'mem_del_01',
      content: 'Memory to be deleted',
      category: 'persistent_memory',
    });

    const deleteResult = await memoryStore.deleteMemory('mem_del_01');
    expect(deleteResult).toBe(true);

    const retrieved = await memoryStore.getMemory('mem_del_01');
    expect(retrieved).toBeNull();
  });

  it('returns null when querying a missing memory', async () => {
    const missing = await memoryStore.getMemory('non_existent_id');
    expect(missing).toBeNull();
  });

  it('handles malformed memory gracefully without crashing', async () => {
    // Put non-JSON string
    mockKV.store.set('memory:malformed_json', 'invalid-json-content');
    const result1 = await memoryStore.getMemory('malformed_json');
    expect(result1).toBeNull();

    // Put JSON missing mandatory fields
    mockKV.store.set('memory:malformed_schema', JSON.stringify({ id: 'bad' }));
    const result2 = await memoryStore.getMemory('malformed_schema');
    expect(result2).toBeNull();
  });

  it('prevents saving a duplicate memory ID', async () => {
    await memoryStore.saveMemory({
      id: 'dup_id',
      content: 'Original memory',
      category: 'persistent_memory',
    });

    await expect(
      memoryStore.saveMemory({
        id: 'dup_id',
        content: 'Duplicate memory',
        category: 'persistent_memory',
      })
    ).rejects.toThrow("Memory with ID 'dup_id' already exists.");
  });

  it('handles memory retrieval failure from KV storage cleanly', async () => {
    mockKV.shouldFailGet = true;
    await expect(memoryStore.getMemory('some_id')).rejects.toThrow('KV storage operation failed.');
  });
});
