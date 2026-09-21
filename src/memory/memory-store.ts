import {
  CreateMemoryInput,
  ListMemoriesOptions,
  MemoryCategory,
  MemoryItem,
  MemorySearchResult,
  MinimalKVNamespace,
  SearchOptions,
  UpdateMemoryInput,
} from './types';

export class MemoryStore {
  private kv: MinimalKVNamespace;
  private keyPrefix: string;

  constructor(kv: MinimalKVNamespace, keyPrefix = 'memory:') {
    this.kv = kv;
    this.keyPrefix = keyPrefix;
  }

  private getKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  /**
   * Safe JSON parsing and schema validation for stored memory objects.
   */
  private parseAndValidateMemory(raw: unknown): MemoryItem | null {
    if (!raw) return null;

    let data: Record<string, any>;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw);
      } catch {
        return null; // Malformed JSON
      }
    } else if (typeof raw === 'object' && raw !== null) {
      data = raw as Record<string, any>;
    } else {
      return null;
    }

    // Validate required fields
    if (
      typeof data.id !== 'string' ||
      !data.id ||
      typeof data.content !== 'string' ||
      typeof data.category !== 'string' ||
      typeof data.createdAt !== 'string' ||
      typeof data.updatedAt !== 'string'
    ) {
      return null; // Invalid schema structure
    }

    const validCategories: MemoryCategory[] = [
      'conversation_context',
      'short_term_context',
      'persistent_memory',
      'knowledge_base',
      'external_info',
      'tool_result',
    ];

    if (!validCategories.includes(data.category as MemoryCategory)) {
      return null;
    }

    return {
      id: data.id,
      content: data.content,
      category: data.category as MemoryCategory,
      confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 1.0,
      source: typeof data.source === 'string' ? data.source : 'user',
      tags: Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === 'string') : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      metadata: typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : {},
    };
  }

  /**
   * Save a new persistent memory.
   * Throws an error if duplicate memory ID exists.
   */
  async saveMemory(input: CreateMemoryInput): Promise<MemoryItem> {
    if (!input.content || typeof input.content !== 'string' || input.content.trim() === '') {
      throw new Error('Memory content cannot be empty.');
    }

    const id = input.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const key = this.getKey(id);

    // Check for duplicate memory
    const existing = await this.kv.get(key, 'text');
    if (existing) {
      throw new Error(`Memory with ID '${id}' already exists.`);
    }

    const now = new Date().toISOString();
    const memory: MemoryItem = {
      id,
      content: input.content.trim(),
      category: input.category || 'persistent_memory',
      confidence: typeof input.confidence === 'number' ? Math.max(0, Math.min(1, input.confidence)) : 1.0,
      source: input.source || 'user',
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata || {},
    };

    const serialized = JSON.stringify(memory);
    await this.kv.put(key, serialized);

    return memory;
  }

  /**
   * Retrieve a single memory by ID. Returns null if missing or malformed.
   */
  async getMemory(id: string): Promise<MemoryItem | null> {
    if (!id) return null;
    const raw = await this.kv.get(this.getKey(id), 'text');
    return this.parseAndValidateMemory(raw);
  }

  /**
   * Update an existing memory item.
   * Throws an error if the memory does not exist.
   */
  async updateMemory(id: string, updates: UpdateMemoryInput): Promise<MemoryItem> {
    const existing = await this.getMemory(id);
    if (!existing) {
      throw new Error(`Memory with ID '${id}' not found.`);
    }

    const updatedMemory: MemoryItem = {
      ...existing,
      content: updates.content !== undefined ? updates.content.trim() : existing.content,
      category: updates.category !== undefined ? updates.category : existing.category,
      confidence: updates.confidence !== undefined ? Math.max(0, Math.min(1, updates.confidence)) : existing.confidence,
      source: updates.source !== undefined ? updates.source : existing.source,
      tags: updates.tags !== undefined ? updates.tags : existing.tags,
      metadata: updates.metadata !== undefined ? { ...existing.metadata, ...updates.metadata } : existing.metadata,
      updatedAt: new Date().toISOString(),
    };

    if (!updatedMemory.content) {
      throw new Error('Memory content cannot be updated to empty string.');
    }

    await this.kv.put(this.getKey(id), JSON.stringify(updatedMemory));
    return updatedMemory;
  }

  /**
   * Delete a memory by ID.
   */
  async deleteMemory(id: string): Promise<boolean> {
    if (!id) return false;
    const key = this.getKey(id);
    const existing = await this.kv.get(key, 'text');
    if (!existing) return false;

    await this.kv.delete(key);
    return true;
  }

  /**
   * List memories with optional filtering by category and limit.
   */
  async listMemories(options: ListMemoriesOptions = {}): Promise<MemoryItem[]> {
    const { category, limit = 50 } = options;
    const listResult = await this.kv.list({ prefix: this.keyPrefix, limit: 100 });
    const memories: MemoryItem[] = [];

    for (const keyObj of listResult.keys) {
      const raw = await this.kv.get(keyObj.name, 'text');
      const memory = this.parseAndValidateMemory(raw);
      if (memory) {
        if (!category || memory.category === category) {
          memories.push(memory);
        }
      }
    }

    return memories.slice(0, limit);
  }

  /**
   * Search relevant memories based on keyword query and confidence thresholds.
   */
  async searchRelevantMemories(query: string, options: SearchOptions = {}): Promise<MemorySearchResult[]> {
    const { category = 'persistent_memory', minConfidence = 0.5, limit = 10 } = options;
    const all = await this.listMemories({ category });
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const results: MemorySearchResult[] = [];

    for (const memory of all) {
      if (memory.confidence < minConfidence) continue;

      let matchCount = 0;
      const contentLower = memory.content.toLowerCase();
      const tagsLower = (memory.tags || []).map((t) => t.toLowerCase());

      for (const term of queryTerms) {
        if (contentLower.includes(term) || tagsLower.some((t) => t.includes(term))) {
          matchCount++;
        }
      }

      if (matchCount > 0 || queryTerms.length === 0) {
        const relevanceScore = queryTerms.length > 0 ? (matchCount / queryTerms.length) * memory.confidence : memory.confidence;
        results.push({ memory, relevanceScore });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
  }
}
