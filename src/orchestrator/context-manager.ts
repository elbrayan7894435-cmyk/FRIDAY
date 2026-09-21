import { AssembledContext, ToolExecutionResult } from './types';
import { MemoryStore } from '../memory';
import { KnowledgeService } from '../knowledge';

export class ContextManager {
  private memoryStore?: MemoryStore;
  private knowledgeService?: KnowledgeService;

  constructor(memoryStore?: MemoryStore, knowledgeService?: KnowledgeService) {
    this.memoryStore = memoryStore;
    this.knowledgeService = knowledgeService;
  }

  /**
   * Assembles context from all six memory categories:
   * 1. conversation context
   * 2. short-term context
   * 3. persistent memories
   * 4. knowledge base
   * 5. external info
   * 6. tool results
   */
  async assembleContext(
    userMessage: string,
    toolResults: ToolExecutionResult[] = []
  ): Promise<AssembledContext> {
    const assembled: AssembledContext = {
      userMessage,
      conversationContext: 'Active session conversation',
      toolResults,
    };

    if (this.memoryStore && userMessage) {
      try {
        const relevant = await this.memoryStore.searchRelevantMemories(userMessage, {
          category: 'persistent_memory',
          minConfidence: 0.4,
          limit: 5,
        });

        if (relevant.length > 0) {
          assembled.persistentMemories = relevant.map((r) => ({
            id: r.memory.id,
            content: r.memory.content,
            confidence: r.memory.confidence,
          }));
        }
      } catch {
        // Safe fallback
      }
    }

    if (this.knowledgeService && userMessage) {
      try {
        const kbResult = await this.knowledgeService.search(userMessage);
        if (kbResult.found && kbResult.results.length > 0) {
          assembled.knowledgeBaseResults = kbResult.results.map((item) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            score: item.score,
          }));
        }
      } catch {
        // Safe fallback
      }
    }

    return assembled;
  }
}
