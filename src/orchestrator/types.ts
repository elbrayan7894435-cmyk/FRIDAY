export type RequestCategory =
  | 'conversational'
  | 'knowledge'
  | 'memory'
  | 'web_research'
  | 'tool_request'
  | 'multi_step'
  | 'unsupported';

export type PermissionLevel = 'normal' | 'high_impact';

export interface ToolSchema {
  type: string;
  properties: Record<string, { type: string; description?: string; required?: boolean }>;
  required?: string[];
}

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: ToolSchema;
  permissionLevel: PermissionLevel;
  execute: (input: TInput, context?: Record<string, unknown>) => Promise<TOutput>;
  resultSchema?: ToolSchema;
}

export interface ToolExecutionResult<T = any> {
  toolName: string;
  success: boolean;
  result?: T;
  error?: string;
  executedAt: string;
  confirmedByUser?: boolean;
}

export interface AuditLogEntry {
  id: string;
  toolName: string;
  permissionLevel: PermissionLevel;
  input: unknown;
  success: boolean;
  error?: string;
  timestamp: string;
  confirmedByUser: boolean;
}

export interface RequestAnalysis {
  category: RequestCategory;
  confidence: number;
  reasoning: string;
  suggestedTools: string[];
  isMultiStep: boolean;
  requiresConfirmation: boolean;
}

export interface AssembledContext {
  userMessage: string;
  conversationContext?: string;
  shortTermContext?: string;
  persistentMemories?: Array<{ id: string; content: string; confidence: number }>;
  knowledgeBaseResults?: Array<{ id: string; title?: string; content: string; score: number }>;
  toolResults?: ToolExecutionResult[];
}

export interface OrchestratorResponse {
  response: string;
  category: RequestCategory;
  toolsExecuted: string[];
  requiresConfirmation: boolean;
  pendingToolCall?: {
    toolName: string;
    input: unknown;
    reason: string;
  };
  auditTrail: AuditLogEntry[];
  contextSummary: {
    memoryUsed: boolean;
    knowledgeUsed: boolean;
    toolsUsed: boolean;
  };
}
