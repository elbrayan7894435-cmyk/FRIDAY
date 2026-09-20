# FRIDAY — AGENT DEVELOPMENT RULES

## PROJECT

FRIDAY is a personal AI assistant web application.

The project must prioritize:

* reliability
* security
* privacy
* maintainability
* elegant UX
* natural interaction
* modular architecture
* explicit permissions
* transparent tool execution
* persistent memory
* knowledge retrieval
* responsive design

FRIDAY must never pretend to have performed an action that it did not actually perform.

FRIDAY must never invent memories, tool results, account information, files, events, messages, or capabilities.

---

## CORE PRINCIPLES

1. Do not make unnecessary architectural changes.
2. Do not replace working systems without a concrete reason.
3. Preserve existing functionality when adding features.
4. Prefer modular components over large monolithic files.
5. Keep frontend and backend responsibilities separated.
6. Never expose secrets in frontend code.
7. Never commit API keys, tokens, OAuth secrets, passwords, credentials, or private configuration.
8. Use environment variables or platform secrets for sensitive configuration.
9. Validate external input.
10. Handle failures explicitly.
11. Provide useful error messages.
12. Log important operations without logging sensitive personal data.
13. Use least-privilege permissions for integrations.
14. Require confirmation for high-impact actions.
15. Keep an audit trail for tool execution.

---

## CURRENT ARCHITECTURE

* **Frontend**: GitHub Pages
* **Backend**: Cloudflare Workers
* **AI**: Cloudflare Workers AI
* **Memory**: Cloudflare KV
* **Knowledge**: Cloudflare AI Search
  * **AI Search instance**: `friday-knowledge`
  * **AI Search namespace**: `default`
  * **Retrieval type**: `vector`
* **Current AI model**: `@cf/zai-org/glm-4.7-flash`

---

## FRONTEND

The frontend should be:

* responsive
* mobile-first
* desktop-compatible
* elegant
* futuristic
* minimal
* coherent
* highly readable
* typography-focused
* visually refined

The interface should use white intelligently while preserving a premium futuristic identity.

Avoid:

* excessive gradients
* excessive glowing effects
* clutter
* unnecessary animations
* generic AI-chat layouts
* visual noise

Typography should be an important part of the design.

---

## FRIDAY PERSONALITY

FRIDAY should feel:

* intelligent
* calm
* precise
* elegant
* natural
* futuristic
* professional
* helpful
* warm
* concise when appropriate
* detailed when necessary

FRIDAY should adapt to the user's communication style without becoming artificial or repetitive.

---

## MEMORY

Memory must be explicit.

FRIDAY should distinguish between:

1. temporary conversation context
2. persistent user memories
3. knowledge-base information
4. external information
5. tool results

Never confuse these categories.

Never claim that something is remembered unless it exists in persistent memory or current context.

---

## KNOWLEDGE

When knowledge retrieval is available:

1. Search the knowledge base.
2. Determine whether the retrieved information is relevant.
3. Prefer authoritative retrieved information over assumptions.
4. Do not fabricate missing information.
5. If knowledge retrieval fails, continue safely and explain the limitation when relevant.

Current AI Search retrieval type: `vector`

---

## TOOLS

Future FRIDAY tools may include:

* web search
* email
* calendar
* files
* notes
* GitHub
* reminders
* messaging
* voice
* external APIs
* automation

Every tool must have:

* explicit schema
* input validation
* error handling
* permission requirements
* execution result
* audit logging

High-impact operations must require user confirmation.

---

## VOICE

Voice is a future feature.

The desired voice personality is:

* young
* masculine
* warm
* calm
* natural
* confident
* friendly
* professional

It may be inspired by the general qualities associated with the user's preferred fictional reference, but must not imitate or clone a real actor's voice.

Voice must eventually support:

* selectable voices
* voice speed
* voice style
* text-to-speech
* speech-to-text
* interruption
* conversational turn-taking

---

## SECURITY

Never:

* expose secrets
* store passwords in plaintext
* place private tokens in frontend JavaScript
* grant unrestricted account access
* bypass authentication
* bypass authorization
* silently execute high-impact actions

Use:

* OAuth
* least-privilege scopes
* secure token storage
* confirmation flows
* revocation
* audit logs

---

## DEVELOPMENT WORKFLOW

Before modifying code:

1. Inspect the repository.
2. Understand the current architecture.
3. Identify affected files.
4. Explain the proposed changes.
5. Preserve unrelated functionality.

After modifying code:

1. Run tests.
2. Run linting if available.
3. Build the application.
4. Verify important routes.
5. Verify API contracts.
6. Check browser behavior.
7. Check responsive behavior.
8. Report exactly what changed.

Do not claim tests passed unless they were actually executed.

---

## CHANGE DISCIPLINE

Do not:

* rewrite the entire project unnecessarily
* remove working features without permission
* introduce unnecessary frameworks
* add dependencies without justification
* create duplicate systems
* silently change APIs
* silently change environment variables
* silently change deployment configuration

When a change is architectural, explain why it is necessary.

---

## OUTPUT QUALITY

FRIDAY should eventually feel like a real personal operating layer rather than a simple chatbot.

Every implementation should move the project toward:

* reliability
* intelligence
* memory
* tool use
* personalization
* security
* elegant UX
* extensibility
* multi-device capability
* voice
* automation

The long-term architecture matters more than quickly adding random features.
