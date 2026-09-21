import {
  AuditLogEntry,
  PermissionLevel,
  ToolDefinition,
  ToolExecutionResult,
} from './types';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private auditLogs: AuditLogEntry[] = [];

  registerTool(tool: ToolDefinition): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid string name.');
    }
    if (!tool.execute || typeof tool.execute !== 'function') {
      throw new Error(`Tool '${tool.name}' must provide an execute function.`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  validateInput(toolName: string, input: any): { valid: boolean; error?: string } {
    const tool = this.getTool(toolName);
    if (!tool) {
      return { valid: false, error: `Tool '${toolName}' is not registered.` };
    }

    const schema = tool.inputSchema;
    if (schema && schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (input == null || input[field] === undefined || input[field] === '') {
          return { valid: false, error: `Missing required field '${field}' for tool '${toolName}'.` };
        }
      }
    }

    return { valid: true };
  }

  async executeTool(
    toolName: string,
    input: any,
    confirmedByUser = false,
    context?: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(toolName);
    const timestamp = new Date().toISOString();

    if (!tool) {
      const errorMsg = `Tool '${toolName}' not found in registry.`;
      this.recordAudit(toolName, 'normal', input, false, errorMsg, timestamp, confirmedByUser);
      return {
        toolName,
        success: false,
        error: errorMsg,
        executedAt: timestamp,
        confirmedByUser,
      };
    }

    // High impact confirmation check
    if (tool.permissionLevel === 'high_impact' && !confirmedByUser) {
      const errorMsg = `High-impact tool '${toolName}' requires explicit user confirmation before execution.`;
      this.recordAudit(toolName, tool.permissionLevel, input, false, errorMsg, timestamp, false);
      return {
        toolName,
        success: false,
        error: errorMsg,
        executedAt: timestamp,
        confirmedByUser: false,
      };
    }

    // Input validation
    const validation = this.validateInput(toolName, input);
    if (!validation.valid) {
      const errorMsg = validation.error || 'Invalid input schema.';
      this.recordAudit(toolName, tool.permissionLevel, input, false, errorMsg, timestamp, confirmedByUser);
      return {
        toolName,
        success: false,
        error: errorMsg,
        executedAt: timestamp,
        confirmedByUser,
      };
    }

    try {
      const result = await tool.execute(input, context);
      this.recordAudit(toolName, tool.permissionLevel, input, true, undefined, timestamp, confirmedByUser);
      return {
        toolName,
        success: true,
        result,
        executedAt: timestamp,
        confirmedByUser,
      };
    } catch (err: any) {
      const errorMsg = err.message || `Execution error in tool '${toolName}'.`;
      this.recordAudit(toolName, tool.permissionLevel, input, false, errorMsg, timestamp, confirmedByUser);
      return {
        toolName,
        success: false,
        error: errorMsg,
        executedAt: timestamp,
        confirmedByUser,
      };
    }
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  private recordAudit(
    toolName: string,
    permissionLevel: PermissionLevel,
    input: unknown,
    success: boolean,
    error?: string,
    timestamp?: string,
    confirmedByUser = false
  ): void {
    this.auditLogs.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      toolName,
      permissionLevel,
      input,
      success,
      error,
      timestamp: timestamp || new Date().toISOString(),
      confirmedByUser,
    });
  }
}
