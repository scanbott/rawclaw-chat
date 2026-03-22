import { searchKnowledge, getKnowledgeDocs } from '../db/knowledge.js';
import { getAllSettings } from '../db/settings.js';

/**
 * Fetch relevant knowledge documents based on user's message.
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getRelevantKnowledge(query, limit = 5) {
  if (!query) return [];
  try {
    return await searchKnowledge(query, limit);
  } catch {
    return [];
  }
}

/**
 * Build the full system prompt with company context and relevant docs.
 * @param {string} userMessage - The user's latest message text
 * @returns {Promise<string>}
 */
export async function buildSystemPrompt(userMessage) {
  let companyName = 'the company';
  let companyDescription = '';
  let brandVoice = '';

  try {
    const settings = await getAllSettings();
    companyName = settings.company_name || companyName;
    companyDescription = settings.company_description || '';
    brandVoice = settings.brand_voice || '';
  } catch {
    // Settings unavailable, continue with defaults
  }

  let prompt = `You are a helpful AI assistant for ${companyName}.`;

  if (companyDescription) {
    prompt += ` ${companyDescription}`;
  }

  if (brandVoice) {
    prompt += `\n\nBrand voice guidelines: ${brandVoice}`;
  }

  // Fetch relevant knowledge
  const docs = await getRelevantKnowledge(userMessage);

  if (docs.length > 0) {
    prompt += '\n\nRelevant company knowledge (use this to inform your responses):\n';
    for (const doc of docs) {
      prompt += `\n--- ${doc.title} (${doc.category}) ---\n${doc.content}\n`;
    }
  }

  prompt += '\n\nIf you don\'t have specific company information to answer a question, say so rather than making assumptions.';

  return prompt;
}
