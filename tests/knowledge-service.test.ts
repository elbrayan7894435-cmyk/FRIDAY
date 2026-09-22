import { describe, expect, it, beforeEach } from 'vitest';
import { KnowledgeService } from '../src/knowledge/knowledge-service';
import { AISearchProvider } from '../src/knowledge/types';

class MockAISearchProvider implements AISearchProvider {
  public shouldFail = false;
  public mockResults: any[] = [];

  async search(query: string, options?: any): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Cloudflare AI Search service unavailable');
    }
    return {
      results: this.mockResults,
      options,
    };
  }
}

describe('KnowledgeService - Knowledge Retrieval Architecture', () => {
  let mockProvider: MockAISearchProvider;
  let service: KnowledgeService;

  beforeEach(() => {
    mockProvider = new MockAISearchProvider();
    service = new KnowledgeService(mockProvider, {
      instance: 'friday-knowledge',
      namespace: 'default',
      retrievalType: 'vector',
      minRelevanceScore: 0.35,
    });
  });

  it('returns structured knowledge search result when matches are found', async () => {
    mockProvider.mockResults = [
      {
        id: 'kb_01',
        title: 'FRIDAY Security Architecture',
        content: 'FRIDAY enforces least-privilege permissions and persistent memory separation.',
        score: 0.92,
      },
    ];

    const result = await service.search('security permissions');

    expect(result.found).toBe(true);
    expect(result.source).toBe('knowledge_base');
    expect(result.confidence).toBe(0.92);
    expect(result.query).toBe('security permissions');
    expect(result.results.length).toBe(1);
    expect(result.results[0].title).toBe('FRIDAY Security Architecture');
  });

  it('filters out results below the minimum relevance threshold', async () => {
    mockProvider.mockResults = [
      {
        id: 'kb_low',
        content: 'Irrelevant document text',
        score: 0.20, // below 0.35 threshold
      },
    ];

    const result = await service.search('some query');

    expect(result.found).toBe(false);
    expect(result.results.length).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('handles search failures gracefully without crashing or hallucinating missing knowledge', async () => {
    mockProvider.shouldFail = true;

    const result = await service.search('architecture query');

    expect(result.found).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.error).toBe('Cloudflare AI Search service unavailable');
  });

  it('handles empty or blank query strings cleanly', async () => {
    const result = await service.search('   ');

    expect(result.found).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  it('exposes developer diagnostic metadata accurately', async () => {
    mockProvider.mockResults = [
      {
        id: 'kb_diag',
        content: 'Diagnostic knowledge item',
        score: 0.85,
      },
    ];

    await service.search('diagnostic check');
    const diagnostics = service.getDiagnostics();

    expect(diagnostics.available).toBe(true);
    expect(diagnostics.instance).toBe('friday-knowledge');
    expect(diagnostics.namespace).toBe('default');
    expect(diagnostics.retrievalType).toBe('vector');
    expect(diagnostics.lastQuery).toBe('diagnostic check');
    expect(diagnostics.lastResultsCount).toBe(1);
    expect(diagnostics.timestamp).toBeDefined();
  });
});
