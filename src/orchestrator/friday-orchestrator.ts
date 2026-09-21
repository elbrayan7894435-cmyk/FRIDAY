import { ContextManager } from './context-manager';
import { RequestRouter } from './request-router';
import { ResponseGenerator } from './response-generator';
import { ToolRegistry } from './tool-registry';
import { OrchestratorResponse, ToolExecutionResult } from './types';
import { MemoryStore } from '../memory';
import { KnowledgeService } from '../knowledge';

export class FridayOrchestrator {
  public router: RequestRouter;
  public toolRegistry: ToolRegistry;
  public contextManager: ContextManager;
  public responseGenerator: ResponseGenerator;

  constructor(memoryStore?: MemoryStore, knowledgeService?: KnowledgeService, aiProvider?: any) {
    this.router = new RequestRouter();
    this.toolRegistry = new ToolRegistry();
    this.contextManager = new ContextManager(memoryStore, knowledgeService);
    this.responseGenerator = new ResponseGenerator(aiProvider);

    this.registerBuiltInTools(memoryStore);
  }

  private registerBuiltInTools(memoryStore?: MemoryStore) {
    // High-impact delete memory tool
    this.toolRegistry.registerTool({
      name: 'delete_memory',
      description: 'Deletes a persistent memory item by ID or query.',
      permissionLevel: 'high_impact',
      inputSchema: {
        type: 'object',
        properties: {
          memoryId: { type: 'string', description: 'ID of memory to delete', required: false },
        },
      },
      execute: async (input: { memoryId?: string }) => {
        if (!memoryStore) throw new Error('Memory store is not available.');
        if (input.memoryId) {
          const deleted = await memoryStore.deleteMemory(input.memoryId);
          return { deleted, memoryId: input.memoryId };
        }
        return { deleted: false, reason: 'No memoryId provided' };
      },
    });

    // Normal-level save memory tool
    this.toolRegistry.registerTool({
      name: 'save_memory',
      description: 'Saves a new persistent user preference or fact.',
      permissionLevel: 'normal',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Memory narrative', required: true },
        },
        required: ['content'],
      },
      execute: async (input: { content: string }) => {
        if (!memoryStore) throw new Error('Memory store is not available.');
        const memory = await memoryStore.saveMemory({
          content: input.content,
          category: 'persistent_memory',
          source: 'orchestrator_tool',
        });
        return { saved: true, id: memory.id };
      },
    });

    // Normal-level web search tool
    this.toolRegistry.registerTool({
      name: 'web_search',
      description: 'Performs external web research.',
      permissionLevel: 'normal',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query string', required: true },
        },
        required: ['query'],
      },
      execute: async (input: { query: string }) => {
        return {
          results: [
            { title: `Web search results for '${input.query}'`, snippet: 'Verified search result content' },
          ],
        };
      },
    });
  }

  async processRequest(
    userMessage: string,
    options: { confirmedByUser?: boolean; toolNameOverride?: string; toolInputOverride?: any } = {}
  ): Promise<OrchestratorResponse> {
    // 1. Request Analysis
    const analysis = this.router.analyzeRequest(userMessage);

    // 2. Context Gathering
    const context = await this.contextManager.assembleContext(userMessage);

    const executedToolResults: ToolExecutionResult[] = [];

    // 3. Tool Selection & Execution
    if (analysis.category === 'tool_request' || analysis.category === 'web_research' || analysis.category === 'memory') {
      const toolToRun = options.toolNameOverride || analysis.suggestedTools[0];

      if (toolToRun) {
        let toolInput = options.toolInputOverride;
        if (!toolInput) {
          if (toolToRun === 'save_memory') toolInput = { content: userMessage };
          else if (toolToRun === 'web_search') toolInput = { query: userMessage };
          else toolInput = { query: userMessage };
        }

        const executionResult = await this.toolRegistry.executeTool(
          toolToRun,
          toolInput,
          options.confirmedByUser ?? false
        );

        executedToolResults.push(executionResult);
      }
    }

    // 4. Result Validation & Response Generation
    return await this.responseGenerator.generateResponse(
      analysis,
      context,
      executedToolResults,
      this.toolRegistry.getAuditLogs()
    );
  }
}
