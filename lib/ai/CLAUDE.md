# lib/ai/ -- LLM Integration

## Architecture

Direct Anthropic SDK integration (no LangChain/LangGraph). Single agent type with tool call loop.

**Chat Agent** -- `createChatStream()` in `agent.js`:
- System prompt: built dynamically from company settings + knowledge base context (`knowledge-context.js`)
- Tools: `search_knowledge` (queries Supabase knowledge_docs), `launch_agent` (placeholder for future agent tasks)
- Streams responses via Anthropic SDK `messages.stream()`
- Tool call loop handled in `index.js` -- continues calling the model until no more tool_use blocks

## Files

- `agent.js` -- Anthropic SDK client, tool definitions, `createChatStream()`, `handleToolCall()`
- `index.js` -- `chatStream()` async generator (tool loop, DB persistence, auto-title), `persistMessage()`, `autoTitle()`
- `knowledge-context.js` -- `buildSystemPrompt()`, `getRelevantKnowledge()` -- fetches company settings and knowledge docs
- `model.js` -- `getModelConfig()` -- returns resolved provider/model/maxTokens from config
- `tools.js` -- Re-exports `getTools()` from agent.js
- `web-search.js` -- `isWebSearchAvailable()` check used by render-md.js

## Model Configuration

| Config Key | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` | Provider slug |
| `LLM_MODEL` | `claude-sonnet-4-20250514` | Model ID |
| `LLM_MAX_TOKENS` | `4096` | Max response tokens |
| `ANTHROPIC_API_KEY` | -- | Required API key |

## Chat Streaming

`chatStream()` in `index.js` yields chunks: `{ type: 'text', text }`, `{ type: 'tool-call', toolCallId, toolName, args }`, `{ type: 'tool-result', toolCallId, result }`. Called by `lib/chat/api.js` (the `/stream/chat` endpoint).

The tool call loop works by accumulating tool_use blocks from the stream, executing each tool via `handleToolCall()`, appending results as a user message with `tool_result` blocks, and re-calling the model until no more tool_use blocks appear.
