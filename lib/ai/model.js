/**
 * Model configuration for rawclaw-chat.
 * Returns the model name from env or default.
 */
export function getModelConfig() {
  return {
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  };
}
