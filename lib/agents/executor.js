/**
 * Agent execution backends.
 * Both light and heavy tasks now use the Claude CLI.
 * - executeLight: quick CLI call for fast tasks
 * - executeHeavy: CLI call with longer timeout for complex tasks
 */

import { spawn } from 'child_process';

/**
 * Run a task via Claude CLI.
 * @param {string} prompt - User prompt
 * @param {string} [systemPrompt] - Optional system prompt
 * @param {object} [options]
 * @param {string} [options.workDir] - Working directory
 * @param {number} [options.timeout] - Timeout in ms (default 2 min)
 * @returns {Promise<string>} The response text
 */
function runClaude(prompt, systemPrompt, options = {}) {
  const { workDir, timeout = 2 * 60 * 1000 } = options;

  return new Promise((resolve, reject) => {
    const args = [
      '-p', prompt,
      '--output-format', 'json',
      '--no-session-persistence',
    ];

    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    const model = process.env.AGENT_MODEL || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    args.push('--model', model);

    const proc = spawn('claude', args, {
      cwd: workDir || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DISABLE_INTERACTIVITY: '1' },
      timeout,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result.result || '');
        } catch {
          resolve(stdout.trim());
        }
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}

/**
 * Execute a light task via Claude CLI (short timeout).
 * @param {string} prompt - User prompt
 * @param {string} [systemPrompt] - Optional system prompt
 * @returns {Promise<string>} The response text
 */
export async function executeLight(prompt, systemPrompt) {
  return runClaude(prompt, systemPrompt, { timeout: 2 * 60 * 1000 });
}

/**
 * Execute a heavy task via Claude CLI (long timeout).
 * @param {string} prompt - User prompt
 * @param {string} [systemPrompt] - Optional system prompt
 * @param {string} [workDir] - Working directory for the CLI process
 * @returns {Promise<string>} The CLI output
 */
export async function executeHeavy(prompt, systemPrompt, workDir) {
  return runClaude(prompt, systemPrompt, { workDir, timeout: 5 * 60 * 1000 });
}
