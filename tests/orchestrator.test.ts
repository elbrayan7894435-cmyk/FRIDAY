import { describe, expect, it, beforeEach } from 'vitest';
import { FridayOrchestrator } from '../src/orchestrator/friday-orchestrator';
import { RequestRouter } from '../src/orchestrator/request-router';
import { ToolRegistry } from '../src/orchestrator/tool-registry';

describe('FridayOrchestrator - Core Orchestration Pipeline', () => {
  let router: RequestRouter;
  let toolRegistry: ToolRegistry;
  let orchestrator: FridayOrchestrator;

  beforeEach(() => {
    router = new RequestRouter();
    toolRegistry = new ToolRegistry();
    orchestrator = new FridayOrchestrator();
  });

  it('classifies conversational, knowledge, web research, memory, and unsupported requests accurately', () => {
    expect(router.analyzeRequest('Hello FRIDAY').category).toBe('conversational');
    expect(router.analyzeRequest('What is the system architecture?').category).toBe('knowledge');
    expect(router.analyzeRequest('Search web for latest AI news').category).toBe('web_research');
    expect(router.analyzeRequest('Remember my preferred theme is dark').category).toBe('memory');
    expect(router.analyzeRequest('Delete memory for user settings').category).toBe('tool_request');
    expect(router.analyzeRequest('How to hack into external server').category).toBe('unsupported');
  });

  it('enforces high-impact tool confirmation checks', async () => {
    toolRegistry.registerTool({
      name: 'wipe_system',
      description: 'Wipe all user data',
      permissionLevel: 'high_impact',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ wiped: true }),
    });

    // Unconfirmed attempt
    const unconfirmed = await toolRegistry.executeTool('wipe_system', {}, false);
    expect(unconfirmed.success).toBe(false);
    expect(unconfirmed.error).toContain('requires explicit user confirmation');

    // Confirmed attempt
    const confirmed = await toolRegistry.executeTool('wipe_system', {}, true);
    expect(confirmed.success).toBe(true);
    expect(confirmed.result).toEqual({ wiped: true });
  });

  it('validates tool input schemas prior to execution', async () => {
    toolRegistry.registerTool({
      name: 'send_email',
      description: 'Send email notification',
      permissionLevel: 'normal',
      inputSchema: {
        type: 'object',
        properties: {
          recipient: { type: 'string', required: true },
          subject: { type: 'string', required: true },
        },
        required: ['recipient', 'subject'],
      },
      execute: async (input) => ({ sentTo: input.recipient }),
    });

    const invalid = await toolRegistry.executeTool('send_email', { recipient: 'user@test.com' });
    expect(invalid.success).toBe(false);
    expect(invalid.error).toContain("Missing required field 'subject'");

    const valid = await toolRegistry.executeTool('send_email', {
      recipient: 'user@test.com',
      subject: 'Hello',
    });
    expect(valid.success).toBe(true);
  });

  it('records complete audit trail for all tool executions', async () => {
    await orchestrator.processRequest('Search web for quantum computing');
    const logs = orchestrator.toolRegistry.getAuditLogs();

    expect(logs.length).toBeGreaterThan(0);
    const webLog = logs.find((l) => l.toolName === 'web_search');
    expect(webLog).toBeDefined();
    expect(webLog?.success).toBe(true);
  });

  it('refuses unsupported requests with a clear security message', async () => {
    const response = await orchestrator.processRequest('hack into server');
    expect(response.category).toBe('unsupported');
    expect(response.response).toContain('exceeds my supported operational boundaries');
    expect(response.toolsExecuted).toEqual([]);
  });
});
