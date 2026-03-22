/**
 * Agent launcher. Routes tasks to light (API) or heavy (CLI) execution.
 */

import { executeLight, executeHeavy } from './executor.js';
import { createAgentLog, updateAgentLog } from '../db/agents.js';

/**
 * Launch an agent task.
 * @param {'light'|'heavy'} type - Execution mode
 * @param {string} prompt - The task prompt
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {object} [options]
 * @param {string} [options.systemPrompt] - System prompt override
 * @param {string} [options.workDir] - Working directory for heavy tasks
 * @returns {Promise<{taskId: string, status: string, result?: string}>}
 */
export async function launchAgent(type, prompt, userId, chatId, options = {}) {
  const log = await createAgentLog({
    agentId: type,
    userId,
    chatId,
    prompt,
    status: 'running',
    metadata: { type, startedAt: new Date().toISOString() },
  });

  const taskId = log.id;

  // Fire and don't block -- run in background
  (async () => {
    try {
      let result;
      if (type === 'heavy') {
        result = await executeHeavy(prompt, options.systemPrompt, options.workDir);
      } else {
        result = await executeLight(prompt, options.systemPrompt);
      }
      await updateAgentLog(taskId, {
        status: 'completed',
        result,
        metadata: { type, completedAt: new Date().toISOString() },
      });
    } catch (err) {
      await updateAgentLog(taskId, {
        status: 'failed',
        result: err.message,
        metadata: { type, error: err.message, failedAt: new Date().toISOString() },
      }).catch(() => {});
    }
  })();

  return { taskId, status: 'running' };
}
