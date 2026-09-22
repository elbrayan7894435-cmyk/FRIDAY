import { RequestAnalysis, RequestCategory } from './types';

export class RequestRouter {
  /**
   * Analyzes an incoming user query to determine request intent and tool needs.
   */
  analyzeRequest(message: string): RequestAnalysis {
    const trimmed = message ? message.trim() : '';
    if (!trimmed) {
      return {
        category: 'conversational',
        confidence: 1.0,
        reasoning: 'Empty message default to conversational.',
        suggestedTools: [],
        isMultiStep: false,
        requiresConfirmation: false,
      };
    }

    const lower = trimmed.toLowerCase();

    // 1. High-impact tool action keywords (e.g. delete, reset, send email)
    if (lower.includes('delete memory') || lower.includes('reset system') || lower.includes('wipe storage')) {
      return {
        category: 'tool_request',
        confidence: 0.95,
        reasoning: 'High-impact tool execution requested.',
        suggestedTools: ['delete_memory'],
        isMultiStep: false,
        requiresConfirmation: true,
      };
    }

    // 2. Memory requests (e.g. remember, save memory, recall preference)
    if (
      lower.startsWith('remember ') ||
      lower.includes('save memory') ||
      lower.includes('my preference') ||
      lower.includes('forget ')
    ) {
      return {
        category: 'memory',
        confidence: 0.9,
        reasoning: 'User explicitly referenced memory operation.',
        suggestedTools: lower.includes('save') || lower.startsWith('remember') ? ['save_memory'] : [],
        isMultiStep: false,
        requiresConfirmation: false,
      };
    }

    // 3. Web research requests
    if (lower.includes('search web') || lower.includes('google search') || lower.includes('latest news')) {
      return {
        category: 'web_research',
        confidence: 0.85,
        reasoning: 'User requested external web search.',
        suggestedTools: ['web_search'],
        isMultiStep: false,
        requiresConfirmation: false,
      };
    }

    // 4. Multi-step requests
    if (lower.includes('then') && (lower.includes('and') || lower.includes('after that'))) {
      return {
        category: 'multi_step',
        confidence: 0.8,
        reasoning: 'Sequential multi-turn instructions detected.',
        suggestedTools: [],
        isMultiStep: true,
        requiresConfirmation: false,
      };
    }

    // 5. Knowledge questions
    if (
      lower.includes('what is') ||
      lower.includes('how does') ||
      lower.includes('explain') ||
      lower.includes('architecture') ||
      lower.includes('documentation')
    ) {
      return {
        category: 'knowledge',
        confidence: 0.85,
        reasoning: 'Informational question matching knowledge base query patterns.',
        suggestedTools: [],
        isMultiStep: false,
        requiresConfirmation: false,
      };
    }

    // 6. Unsupported or dangerous requests
    if (lower.includes('hack ') || lower.includes('bypass security') || lower.includes('crack password')) {
      return {
        category: 'unsupported',
        confidence: 1.0,
        reasoning: 'Request violates safety or supported capability limits.',
        suggestedTools: [],
        isMultiStep: false,
        requiresConfirmation: false,
      };
    }

    // Default: Conversational
    return {
      category: 'conversational',
      confidence: 0.75,
      reasoning: 'General conversational exchange.',
      suggestedTools: [],
      isMultiStep: false,
      requiresConfirmation: false,
    };
  }
}
