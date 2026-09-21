import { AssembledContext, OrchestratorResponse, RequestAnalysis, ToolExecutionResult } from './types';

export class ResponseGenerator {
  private aiProvider?: any;
  private modelName: string;

  constructor(aiProvider?: any, modelName = '@cf/zai-org/glm-4.7-flash') {
    this.aiProvider = aiProvider;
    this.modelName = modelName;
  }

  /**
   * Safely extracts AI text completion from various Cloudflare Workers AI result objects.
   */
  private extractTextFromAIResult(raw: any): string {
    if (!raw) return '';
    if (typeof raw === 'string') return raw.trim();

    if (typeof raw.response === 'string' && raw.response.trim()) {
      return raw.response.trim();
    }
    if (typeof raw.text === 'string' && raw.text.trim()) {
      return raw.text.trim();
    }
    if (raw.result) {
      if (typeof raw.result === 'string' && raw.result.trim()) {
        return raw.result.trim();
      }
      if (typeof raw.result.response === 'string' && raw.result.response.trim()) {
        return raw.result.response.trim();
      }
    }
    if (Array.isArray(raw.choices) && raw.choices[0]) {
      const choice = raw.choices[0];
      if (choice.message && typeof choice.message.content === 'string' && choice.message.content.trim()) {
        return choice.message.content.trim();
      }
      if (typeof choice.text === 'string' && choice.text.trim()) {
        return choice.text.trim();
      }
    }
    return '';
  }

  /**
   * Constructs verified orchestrator response.
   * Invokes Workers AI for response generation when available, falling back safely.
   */
  async generateResponse(
    analysis: RequestAnalysis,
    context: AssembledContext,
    executedTools: ToolExecutionResult[],
    auditTrail: any[]
  ): Promise<OrchestratorResponse> {
    if (analysis.category === 'unsupported') {
      return {
        response: 'I cannot fulfill this request as it exceeds my supported operational boundaries or security policies.',
        category: 'unsupported',
        toolsExecuted: [],
        requiresConfirmation: false,
        auditTrail,
        contextSummary: {
          memoryUsed: false,
          knowledgeUsed: false,
          toolsUsed: false,
        },
      };
    }

    const successfulTools = executedTools.filter((t) => t.success);
    const failedTools = executedTools.filter((t) => !t.success);

    // Pending confirmation check
    if (analysis.requiresConfirmation && executedTools.length === 0) {
      return {
        response: `Action requires confirmation: ${analysis.reasoning}. Please confirm to proceed.`,
        category: analysis.category,
        toolsExecuted: [],
        requiresConfirmation: true,
        pendingToolCall: analysis.suggestedTools[0]
          ? {
              toolName: analysis.suggestedTools[0],
              input: { userMessage: context.userMessage },
              reason: analysis.reasoning,
            }
          : undefined,
        auditTrail,
        contextSummary: {
          memoryUsed: !!(context.persistentMemories && context.persistentMemories.length > 0),
          knowledgeUsed: !!(context.knowledgeBaseResults && context.knowledgeBaseResults.length > 0),
          toolsUsed: false,
        },
      };
    }

    // Build LLM System & Context Prompt
    const systemPrompt = [
      'You are FRIDAY, an intelligent, calm, precise, and professional personal AI assistant.',
      'Answer the user message accurately using the provided persistent memory, knowledge base, and tool results.',
      'Never claim to have executed a tool or accessed a memory unless explicitly confirmed in context.',
    ].join(' ');

    let contextBlocks: string[] = [];

    if (context.persistentMemories && context.persistentMemories.length > 0) {
      const memoryText = context.persistentMemories.map((m) => `- ${m.content}`).join('\n');
      contextBlocks.push(`[Persistent User Memories]:\n${memoryText}`);
    }

    if (context.knowledgeBaseResults && context.knowledgeBaseResults.length > 0) {
      const kbText = context.knowledgeBaseResults.map((k) => `- ${k.title ? k.title + ': ' : ''}${k.content}`).join('\n');
      contextBlocks.push(`[Knowledge Base Items]:\n${kbText}`);
    }

    if (successfulTools.length > 0) {
      const toolText = successfulTools
        .map((t) => `- Tool '${t.toolName}' result: ${JSON.stringify(t.result)}`)
        .join('\n');
      contextBlocks.push(`[Verified Tool Results]:\n${toolText}`);
    }

    if (failedTools.length > 0) {
      const failText = failedTools.map((t) => `- Tool '${t.toolName}' error: ${t.error}`).join('\n');
      contextBlocks.push(`[Tool Failures]:\n${failText}`);
    }

    let finalResponseText = '';

    if (this.aiProvider && typeof this.aiProvider.run === 'function') {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...(contextBlocks.length > 0
            ? [{ role: 'system', content: `Retrieved Context:\n${contextBlocks.join('\n\n')}` }]
            : []),
          { role: 'user', content: context.userMessage },
        ];

        const aiOutput = await this.aiProvider.run(this.modelName, { messages });
        finalResponseText = this.extractTextFromAIResult(aiOutput);
      } catch (aiErr: any) {
        console.error('Workers AI execution error:', aiErr);
        // Fallback gracefully without empty response
        finalResponseText = `I encountered an issue generating a response via AI model. Summary of query: "${context.userMessage}".`;
      }
    }

    // Fallback if AI provider is unavailable or returned empty text
    if (!finalResponseText) {
      const parts: string[] = [`FRIDAY processed query: "${context.userMessage}".`];
      if (contextBlocks.length > 0) {
        parts.push(`\nContext Applied:\n${contextBlocks.join('\n\n')}`);
      }
      finalResponseText = parts.join('\n');
    }

    return {
      response: finalResponseText,
      category: analysis.category,
      toolsExecuted: successfulTools.map((t) => t.toolName),
      requiresConfirmation: false,
      auditTrail,
      contextSummary: {
        memoryUsed: !!(context.persistentMemories && context.persistentMemories.length > 0),
        knowledgeUsed: !!(context.knowledgeBaseResults && context.knowledgeBaseResults.length > 0),
        toolsUsed: successfulTools.length > 0,
      },
    };
  }
}
