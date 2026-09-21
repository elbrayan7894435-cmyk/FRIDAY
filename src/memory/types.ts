export type MemoryCategory =
  | 'conversation_context'
  | 'short_term_context'
  | 'persistent_memory'
  | 'knowledge_base'
  | 'external_info'
  | 'tool_result';

export interface MemoryItem {
  id: string;
  content: string;
  category: MemoryCategory;
  confidence: number; // 0.0 to 1.0
  source: string;
  tags?: string[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  metadata?: Record<string, unknown>;
}

export interface CreateMemoryInput {
  id?: string;
  content: string;
  category: MemoryCategory;
  confidence?: number;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryInput {
  content?: string;
  category?: MemoryCategory;
  confidence?: number;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ListMemoriesOptions {
  category?: MemoryCategory;
  limit?: number;
  prefix?: string;
}

export interface SearchOptions {
  category?: MemoryCategory;
  minConfidence?: number;
  limit?: number;
}

export interface MemorySearchResult {
  memory: MemoryItem;
  relevanceScore: number;
}

/**
 * Minimal KVNamespace interface matching Cloudflare Workers KV definition.
 */
export interface MinimalKVNamespace {
  get(key: string, type?: 'text' | 'json'): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: Array<{ name: string; metadata?: any }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}
