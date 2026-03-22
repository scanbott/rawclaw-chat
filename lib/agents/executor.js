/**
 * Agent execution backends.
 * - executeLight: direct Anthropic API call for fast tasks
 * - executeHeavy: spawns Claude CLI as a child process for complex tasks
 */

import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'child_process';

/**
 * Execute a light task via direct Anthropic API call.
 * @param {string} prompt - User prompt
 * @param {string} [systemPrompt] - Optional system prompt
 * @returns {Promise<string>} The response text
 */
export async function executeLight(prompt, systemPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const client = new Anthropic({ apiKey });

  const messages = [{ role: 'user', content: prompt }];
  const params = {
    model: process.env.AGENT_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages,
  };

  if (systemPrompt) {
    params.system = systemPrompt;
  }

  const response = await client.messages.create(params);

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return text;
}

/**
 * Execute a heavy task by spawning the Claude CLI as a child process.
 * @param {string} prompt - User prompt
 * @param {string} [systemPrompt] - Optional system prompt
 * @param {string} [workDir] - Working directory for the CLI process
 * @returns {Promise<string>} The CLI output
 */
export async function executeHeavy(prompt, systemPrompt, workDir) {
  return new Promise((resolve, reject) => {
    const args = ['--print', prompt];

    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    const proc = spawn('claude', args, {
      cwd: workDir || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
      timeout: 5 * 60 * 1000, // 5 minute timeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}
