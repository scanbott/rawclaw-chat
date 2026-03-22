import { spawn } from 'child_process';
import { buildSystemPrompt } from './knowledge-context.js';

/**
 * Call Claude via the CLI instead of the Anthropic SDK.
 * Requires `claude` to be installed and authenticated (`claude auth login`).
 *
 * @param {string} userMessage - The user's message
 * @param {string} [systemPrompt] - Optional system prompt
 * @param {object} [options]
 * @param {string} [options.model] - Model override
 * @returns {Promise<string>} The response text
 */
export async function callClaude(userMessage, systemPrompt, options = {}) {
  const { model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514' } = options;

  return new Promise((resolve, reject) => {
    const args = [
      '-p', userMessage,
      '--output-format', 'json',
      '--no-session-persistence',
    ];

    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    if (model) {
      args.push('--model', model);
    }

    const proc = spawn('claude', args, {
      env: { ...process.env, DISABLE_INTERACTIVITY: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5 * 60 * 1000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result.result || '');
      } catch {
        // If not JSON, return raw stdout
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}

/**
 * No-op for backwards compat -- there's no client singleton to reset anymore.
 */
function resetChatAgent() {
  // Nothing to reset when using the CLI
}

export { resetChatAgent, buildSystemPrompt };
