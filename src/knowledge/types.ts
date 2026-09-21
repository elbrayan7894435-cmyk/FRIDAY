export interface KnowledgeItem {
  id: string;
  title?: string;
  content: string;
  score: number; // Similarity/Relevance score (0.0 to 1.0)
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
  found: boolean;
  results: KnowledgeItem[];
  source: 'knowledge_base';
  confidence: number;
  query: string;
  error?: string;
}

export interface KnowledgeDiagnostics {
  available: boolean;
  retrievalType: 'vector';
  instance: string;
  namespace: string;
  lastQuery?: string;
  lastResultsCount: number;
  lastError?: string;
  timestamp: string;
}

export interface KnowledgeServiceOptions {
  instance?: string;
  namespace?: string;
  retrievalType?: 'vector';
  minRelevanceScore?: number;
  maxResults?: number;
}

export interface AISearchProvider {
  search(query: string, options?: { instance?: string; namespace?: string; limit?: number }): Promise<any>;
}
