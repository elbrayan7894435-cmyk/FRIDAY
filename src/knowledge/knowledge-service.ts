import {
  AISearchProvider,
  KnowledgeDiagnostics,
  KnowledgeItem,
  KnowledgeSearchResult,
  KnowledgeServiceOptions,
} from './types';

export class KnowledgeService {
  private searchProvider?: AISearchProvider;
  private instance: string;
  private namespace: string;
  private retrievalType: 'vector';
  private minRelevanceScore: number;
  private maxResults: number;

  private lastDiagnostics: KnowledgeDiagnostics;

  constructor(searchProvider?: AISearchProvider, options: KnowledgeServiceOptions = {}) {
    this.searchProvider = searchProvider;
    this.instance = options.instance || 'friday-knowledge';
    this.namespace = options.namespace || 'default';
    this.retrievalType = options.retrievalType || 'vector';
    this.minRelevanceScore = options.minRelevanceScore ?? 0.35;
    this.maxResults = options.maxResults ?? 5;

    this.lastDiagnostics = {
      available: !!searchProvider,
      retrievalType: this.retrievalType,
      instance: this.instance,
      namespace: this.namespace,
      lastResultsCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Searches the knowledge base and evaluates relevance.
   * Gracefully handles search failures without inventing knowledge.
   */
  async search(query: string): Promise<KnowledgeSearchResult> {
    const trimmedQuery = query ? query.trim() : '';

    if (!trimmedQuery) {
      return {
        found: false,
        results: [],
        source: 'knowledge_base',
        confidence: 0,
        query: trimmedQuery,
      };
    }

    if (!this.searchProvider) {
      const result: KnowledgeSearchResult = {
        found: false,
        results: [],
        source: 'knowledge_base',
        confidence: 0,
        query: trimmedQuery,
        error: 'AI Search provider not available',
      };
      this.updateDiagnostics(trimmedQuery, 0, 'AI Search provider not available');
      return result;
    }

    try {
      const rawOutput = await this.searchProvider.search(trimmedQuery, {
        instance: this.instance,
        namespace: this.namespace,
        limit: this.maxResults,
      });

      const parsedItems = this.parseRawSearchResults(rawOutput);
      const relevantItems = parsedItems.filter((item) => item.score >= this.minRelevanceScore);

      const found = relevantItems.length > 0;
      const confidence = found
        ? Math.max(...relevantItems.map((item) => item.score))
        : 0;

      const structuredResult: KnowledgeSearchResult = {
        found,
        results: relevantItems,
        source: 'knowledge_base',
        confidence: Math.min(1, Math.max(0, confidence)),
        query: trimmedQuery,
      };

      this.updateDiagnostics(trimmedQuery, relevantItems.length);
      return structuredResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Error executing knowledge search query';
      this.updateDiagnostics(trimmedQuery, 0, errorMessage);

      return {
        found: false,
        results: [],
        source: 'knowledge_base',
        confidence: 0,
        query: trimmedQuery,
        error: errorMessage,
      };
    }
  }

  /**
   * Get developer diagnostic status.
   */
  getDiagnostics(): KnowledgeDiagnostics {
    return {
      ...this.lastDiagnostics,
      timestamp: new Date().toISOString(),
    };
  }

  private updateDiagnostics(query: string, count: number, error?: string): void {
    this.lastDiagnostics = {
      available: !!this.searchProvider && !error,
      retrievalType: this.retrievalType,
      instance: this.instance,
      namespace: this.namespace,
      lastQuery: query,
      lastResultsCount: count,
      lastError: error,
      timestamp: new Date().toISOString(),
    };
  }

  private parseRawSearchResults(raw: any): KnowledgeItem[] {
    if (!raw) return [];

    let itemsArray: any[] = [];
    if (Array.isArray(raw)) {
      itemsArray = raw;
    } else if (Array.isArray(raw.results)) {
      itemsArray = raw.results;
    } else if (Array.isArray(raw.matches)) {
      itemsArray = raw.matches;
    }

    return itemsArray
      .map((item, idx) => {
        const content = item.content || item.text || item.document || (typeof item === 'string' ? item : '');
        if (!content) return null;

        const score = typeof item.score === 'number' ? item.score : typeof item.similarity === 'number' ? item.similarity : 0.5;

        return {
          id: item.id || `kb_${idx}_${Date.now()}`,
          title: item.title || item.metadata?.title || undefined,
          content: String(content).trim(),
          score: Math.max(0, Math.min(1, score)),
          source: item.source || item.metadata?.source || 'friday-knowledge',
          metadata: item.metadata || {},
        };
      })
      .filter((item): item is KnowledgeItem => item !== null && item.content.length > 0);
  }
}
