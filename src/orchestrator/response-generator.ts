import { AssembledContext, OrchestratorResponse, RequestAnalysis, ToolExecutionResult } from './types';

export class ResponseGenerator {
  /**
   * Constructs verified orchestrator response.
   * Ensures FRIDAY never claims a tool succeeded unless verified.
   */
  generateResponse(
    analysis: RequestAnalysis,
    context: AssembledContext,
    executedTools: ToolExecutionResult[],
    auditTrail: any[]
  ): OrchestratorResponse {
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

    let textParts: string[] = [];

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

    // Base text
    textParts.push(`FRIDAY response for query: "${context.userMessage}"`);

    // Memory Context
    if (context.persistentMemories && context.persistentMemories.length > 0) {
      const memoryText = context.persistentMemories.map((m) => `- ${m.content}`).join('\n');
      textParts.push(`\n[Persistent Memory Context Applied]:\n${memoryText}`);
    }

    // Knowledge Context
    if (context.knowledgeBaseResults && context.knowledgeBaseResults.length > 0) {
      const kbText = context.knowledgeBaseResults.map((k) => `- ${k.title ? k.title + ': ' : ''}${k.content}`).join('\n');
      textParts.push(`\n[Knowledge Base Context Applied]:\n${kbText}`);
    }

    // Tool execution verified output
    if (successfulTools.length > 0) {
      const toolText = successfulTools.map((t) => `- Tool '${t.toolName}' executed successfully`).join('\n');
      textParts.push(`\n[Tools Executed & Verified]:\n${toolText}`);
    }

    if (failedTools.length > 0) {
      const failText = failedTools.map((t) => `- Tool '${t.toolName}' failed: ${t.error}`).join('\n');
      textParts.push(`\n[Tool Failure Notes]:\n${failText}`);
    }

    return {
      response: textParts.join('\n'),
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
