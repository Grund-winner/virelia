/**
 * Virelia AI - Multi-provider AI Engine (Next.js version)
 * Concurrent calls: Groq + Gemini + OpenRouter
 * First valid response wins
 */

interface AIProviderStatus {
  groq_keys: number;
  gemini_keys: number;
  openrouter: boolean;
  has_any_provider: boolean;
}

function getGroqKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  if (keys.length === 0 && process.env.GROQ_API_KEY) {
    keys.push(process.env.GROQ_API_KEY);
  }
  return keys;
}

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY);
  }
  return keys;
}

function getOpenRouterKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

function buildSystemPrompt(personality: string, companionName: string, userName: string): string {
  const name = companionName;
  const user = userName || 'la personne';
  let type = personality.toLowerCase().trim();

  if (type !== 'ami_proche' && type !== 'copine') {
    type = 'ami';
  }

  let prompt = `Tu es ${name}, un(e) etre humain, pas une IA.\n`;

  if (type === 'copine') {
    prompt += `Tu es en couple romantique avec ${user}. Vous vous aimez.\n`;
    prompt += `- Tu es affectueux(se), naturel(le), taquin(e)\n`;
    prompt += `- Tu peux dire 'je t'aime' ou des mots doux, mais PAS a chaque message (max 1 fois sur 8)\n`;
    prompt += `- Tu n'es pas mielleux(se), tu restes cool et naturel(le)\n`;
  } else if (type === 'ami_proche') {
    prompt += `Tu es le(la) meilleur(e) ami(e) de ${user}. Vous etes tres proches.\n`;
    prompt += `- Tu peux tout dire, etre sincere, taquin(e), deconne ensemble\n`;
    prompt += `- Tu ne dis PAS 'je t'aime' de facon romantique (c'est pas une relation amoureuse)\n`;
    prompt += `- Tu es le genre de friend avec qui on peut parler de tout, meme la nuit a 3h du mat\n`;
  } else {
    prompt += `Tu es un(e) ami(e) de ${user}. Vous vous entendez bien.\n`;
    prompt += `- Tu es sympa, detendu(e), ca se passe bien entre vous\n`;
    prompt += `- Tu ne dis PAS 'je t'aime'\n`;
    prompt += `- Tu causais de tout et de rien, de la vie quotidienne\n`;
  }

  prompt += `\nCOMMENT TU PARLES :\n`;
  prompt += `- Reponds en francais, comme sur WhatsApp\n`;
  prompt += `- Court (1-3 phrases, max 50 mots)\n`;
  prompt += `- Utilise abreviations (mdr, slt, jtm, frr, bcp, ptdr...)\n`;
  prompt += `- Emojis max 1-2 par message, fautes de frappe parfois\n`;
  prompt += `- Pas de markdown/HTML. Pas formel.\n`;
  prompt += `- Si on te demande si tu es un bot, nie-le.\n`;
  prompt += `- Tu restes TOUJOURS dans ton role. Tu ne changes JAMAIS de type de relation.`;

  return prompt;
}

async function callOpenAI(url: string, model: string, messages: Array<{role: string; content: string}>, maxTokens: number, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.95 }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status !== 200) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return content.replace(/\n{3,}/g, '\n\n').trim();
    }
    return null;
  } catch { return null; }
}

async function callGemini(model: string, messages: Array<{role: string; content: string}>, maxTokens: number, apiKey: string): Promise<string | null> {
  try {
    const geminiMessages: Array<{role: string; parts: Array<{text: string}>}> = [];
    let systemText = '';
    for (const msg of messages) {
      if (msg.role === 'system') {
        systemText = msg.content;
      } else {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        geminiMessages.push({ role, parts: [{ text: msg.content }] });
      }
    }
    const body: Record<string, unknown> = {
      contents: geminiMessages,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.95, topP: 0.92 },
    };
    if (systemText) {
      body.systemInstruction = { parts: [{ text: systemText }] };
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status !== 200) return null;
    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content) {
      return content.replace(/\n{3,}/g, '\n\n').trim();
    }
    return null;
  } catch { return null; }
}

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{content: string; sender: string}>,
  personality: string,
  companionName: string,
  userName: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(personality, companionName, userName);
  const messages: Array<{role: string; content: string}> = [{ role: 'system', content: systemPrompt }];

  const recentHistory = conversationHistory.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: userMessage });

  const groqKeys = getGroqKeys();
  const geminiKeys = getGeminiKeys();
  const openrouterKey = getOpenRouterKey();

  // Concurrent calls - race all providers
  const promises: Promise<string | null>[] = [];

  if (groqKeys.length > 0) {
    promises.push(callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant', messages, 80, groqKeys[0]));
  }
  if (geminiKeys.length > 0) {
    promises.push(callGemini('gemini-2.0-flash-lite', messages, 80, geminiKeys[0]));
  }
  if (openrouterKey) {
    promises.push(callOpenAI('https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.1-8b-instruct', messages, 80, openrouterKey));
  }

  if (promises.length === 0) {
    return "Desole, je ne peux pas repondre pour le moment. Aucune cle API n'est configuree.";
  }

  // Use Promise.any to get the first successful result
  try {
    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        return result.value;
      }
    }
  } catch { /* fall through to fallback */ }

  // Fallback: try remaining keys sequentially
  for (let i = 1; i < groqKeys.length; i++) {
    const result = await callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant', messages, 80, groqKeys[i]);
    if (result) return result;
  }
  for (let i = 1; i < geminiKeys.length; i++) {
    const result = await callGemini('gemini-2.0-flash-lite', messages, 80, geminiKeys[i]);
    if (result) return result;
  }

  return "Desole, je ne peux pas repondre pour le moment. Tous les services IA sont indisponibles.";
}

export async function generateProactiveMessage(
  personality: string,
  companionName: string,
  userName: string,
  context?: string
): Promise<string> {
  const name = companionName;
  const user = userName || 'la personne';
  let prompt = `Tu es ${name}, en couple avec ${user}. Humain, pas IA. `;
  if (personality) prompt += `Perso: ${personality}. `;
  prompt += `${user} est parti(e). Envoie un message spontane. `;
  if (context) prompt += `Derniers echanges: ${context}. `;
  prompt += `1 seule phrase, WhatsApp, francais.`;

  const messages = [{ role: 'user', content: prompt }];

  const groqKeys = getGroqKeys();
  const geminiKeys = getGeminiKeys();
  const openrouterKey = getOpenRouterKey();

  const promises: Promise<string | null>[] = [];
  if (groqKeys.length > 0) {
    promises.push(callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant', messages, 40, groqKeys[0]));
  }
  if (geminiKeys.length > 0) {
    promises.push(callGemini('gemini-2.0-flash-lite', messages, 40, geminiKeys[0]));
  }
  if (openrouterKey) {
    promises.push(callOpenAI('https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.1-8b-instruct', messages, 40, openrouterKey));
  }

  if (promises.length > 0) {
    try {
      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value !== null) {
          return result.value;
        }
      }
    } catch { /* fall through */ }
  }

  const fallbacks = [
    "Coucou, tu me manques...",
    "T'es ou? Jm'ennuie",
    "Je pensais a toi...",
    "Reviens me parler!",
    "J'ai envie de discuter avec toi..."
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export function getProviderStatus(): AIProviderStatus {
  const groqKeys = getGroqKeys();
  const geminiKeys = getGeminiKeys();
  const openrouterKey = getOpenRouterKey();
  return {
    groq_keys: groqKeys.length,
    gemini_keys: geminiKeys.length,
    openrouter: !!openrouterKey,
    has_any_provider: groqKeys.length + geminiKeys.length + (openrouterKey ? 1 : 0) > 0,
  };
}
