import Anthropic from '@anthropic-ai/sdk';
import { searchKnowledge } from '../db/knowledge.js';
import { buildSystemPrompt } from './knowledge-context.js';
import { getConfig } from '../config.js';

let _client = null;

function getClient() {
  if (_client) return _client;
  const apiKey = getConfig('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required -- set it on the Settings > Chat page');
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Get available tools for the chat agent.
 */
function getTools() {
  return [
    {
      name: 'search_knowledge',
      description: 'Search the company knowledge base for relevant documents and information.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
    {
      name: 'launch_agent',
      description: 'Launch a background agent to perform a task. Use this for research, analysis, drafting, or any task that requires extended work.',
      input_schema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'What the agent should do' },
          type: { type: 'string', enum: ['research', 'analysis', 'draft', 'general'], description: 'Type of task' },
        },
        required: ['task'],
      },
    },
  ];
}

/**
 * Handle tool calls from the model.
 * @param {string} toolName
 * @param {object} toolInput
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function handleToolCall(toolName, toolInput, userId) {
  switch (toolName) {
    case 'search_knowledge': {
      const docs = await searchKnowledge(toolInput.query, 5);
      if (docs.length === 0) return 'No relevant documents found.';
      return docs.map(d => `**${d.title}** (${d.category})\n${d.content}`).join('\n\n---\n\n');
    }
    case 'launch_agent': {
      // Placeholder -- agent launching will be built in a future phase.
      return `Agent task queued: "${toolInput.task}" (type: ${toolInput.type || 'general'}). This feature is coming soon.`;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}

/**
 * Create a streaming chat response using the Anthropic SDK.
 * Returns a raw Anthropic stream that the caller processes.
 *
 * @param {object} options
 * @param {Array} options.messages - Chat messages in {role, content} format
 * @param {string} options.userId - User ID for tool context
 * @param {string} options.chatId - Chat thread ID
 * @returns {Promise<import('@anthropic-ai/sdk').MessageStream>}
 */
async function createChatStream({ messages, userId, chatId }) {
  const client = getClient();

  // Build system prompt with knowledge context from the latest user message
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const userText = typeof lastUserMessage?.content === 'string'
    ? lastUserMessage.content
    : '';
  const systemPrompt = await buildSystemPrompt(userText);

  // Convert messages to Anthropic format
  const anthropicMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content,
    }));

  const model = getConfig('LLM_MODEL') || 'claude-sonnet-4-20250514';
  const maxTokens = parseInt(getConfig('LLM_MAX_TOKENS') || '4096', 10);

  return client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: anthropicMessages,
    tools: getTools(),
  });
}

/**
 * Reset the client singleton (e.g., when API key changes).
 */
function resetChatAgent() {
  _client = null;
}

export { createChatStream, handleToolCall, getTools, resetChatAgent, getClient };
