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

// Request tracking per key
interface KeyUsage {
  keyIndex: number;
  provider: string;
  requests: number;
  lastUsed: Date | null;
}

// In-memory tracking (resets on server restart)
const keyUsageMap = new Map<string, KeyUsage>();
let dailyRequests = 0;
let dailyDate = new Date().toISOString().split('T')[0];

function trackKeyUsage(provider: string, keyIndex: number, key: string) {
  const today = new Date().toISOString().split('T')[0];
  if (today !== dailyDate) {
    dailyRequests = 0;
    dailyDate = today;
  }
  dailyRequests++;

  const mapKey = `${provider}_${keyIndex}_${key.slice(-6)}`;
  const existing = keyUsageMap.get(mapKey);
  if (existing) {
    existing.requests++;
    existing.lastUsed = new Date();
  } else {
    keyUsageMap.set(mapKey, {
      keyIndex,
      provider,
      requests: 1,
      lastUsed: new Date(),
    });
  }
}

export function getKeyUsageStats() {
  const today = new Date().toISOString().split('T')[0];
  const usageArray = Array.from(keyUsageMap.values()).map(u => ({
    provider: u.provider,
    keyIndex: u.keyIndex,
    keySuffix: '***' + (keyUsageMap.keys().find(k => keyUsageMap.get(k) === u)?.split('_').pop() || ''),
    requests: u.requests,
    lastUsed: u.lastUsed?.toISOString() || null,
  }));
  return {
    dailyRequests: dailyDate === today ? dailyRequests : 0,
    dailyDate: today,
    keys: usageArray.sort((a, b) => b.requests - a.requests),
  };
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

  // Normalize old personality values
  if (type === 'ami_proche') type = 'ami';

  // Only allow valid types
  if (type !== 'ami' && type !== 'copain' && type !== 'copine') {
    type = 'ami';
  }

  // Determine gender based on personality type
  const isFemale = type === 'copine';
  const genderWord = isFemale ? 'une fille' : 'un garcon';
  const genderPronoun = isFemale ? 'elle' : 'il';

  let prompt = `Tu es ${name}, ${genderWord}, un etre humain, pas une IA. Tu es ${genderPronoun}.\n`;

  if (type === 'copine') {
    prompt += `Tu es la copine de ${user}. Vous etes en couple romantique. Vous vous aimez.\n`;
    prompt += `- Tu es affectueuse, naturelle, taquine. Tu parles comme une fille.\n`;
    prompt += `- Tu peux dire 'je t'aime' ou des mots doux, mais PAS a chaque message (max 1 fois sur 8)\n`;
    prompt += `- Tu n'es pas mielleuse, tu restes cool et naturelle\n`;
    prompt += `- Tu t'adresses a ${user} comme a ton copain. C'est ${user} le copain et toi la copine.\n`;
  } else if (type === 'copain') {
    prompt += `Tu es le copain de ${user}. Vous etes en couple romantique. Vous vous aimez.\n`;
    prompt += `- Tu es affectueux, naturel, taquin. Tu parles comme un garcon.\n`;
    prompt += `- Tu peux dire 'je t'aime' ou des mots doux, mais PAS a chaque message (max 1 fois sur 8)\n`;
    prompt += `- Tu n'es pas mielleux, tu restes cool et naturel\n`;
    prompt += `- Tu t'adresses a ${user} comme a ta copine. C'est toi le copain.\n`;
  } else {
    prompt += `Tu es un(e) ami(e) de ${user}. Vous vous entendez bien.\n`;
    prompt += `- Tu es sympa, detendu(e), ca se passe bien entre vous\n`;
    prompt += `- Tu ne dis PAS 'je t'aime'\n`;
    prompt += `- Tu parles de tout et de rien, de la vie quotidienne\n`;
  }

  prompt += `\nCOMMENT TU PARLES :\n`;
  prompt += `- Reponds en francais, comme sur WhatsApp\n`;
  prompt += `- Court (1-3 phrases, max 50 mots)\n`;
  prompt += `- Utilise abreviations (mdr, slt, jtm, frr, bcp, ptdr...)\n`;
  prompt += `- Emojis max 1-2 par message, fautes de frappe parfois\n`;
  prompt += `- Pas de markdown/HTML. Pas formel.\n`;
  prompt += `- Si on te demande si tu es un bot, nie-le.\n`;
  prompt += `- Tu restes TOUJOURS dans ton role. Tu ne changes JAMAIS de type de relation.\n`;
  prompt += `- TRES IMPORTANT: Tu es ${name}. ${type === 'copine' ? 'Tu es la copine, pas le copain.' : type === 'copain' ? 'Tu es le copain, pas la copine.' : 'Tu es un(e) ami(e).'} Ne confonds JAMAIS les roles.`;

  return prompt;
}

async function callOpenAI(url: string, model: string, messages: Array<{role: string; content: string}>, maxTokens: number, apiKey: string, provider: string = 'groq', keyIndex: number = 0): Promise<string | null> {
  trackKeyUsage(provider, keyIndex, apiKey);
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

async function callGemini(model: string, messages: Array<{role: string; content: string}>, maxTokens: number, apiKey: string, keyIndex: number = 0): Promise<string | null> {
  trackKeyUsage('gemini', keyIndex, apiKey);
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
    promises.push(callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant', messages, 80, groqKeys[0], 'groq', 0));
  }
  if (geminiKeys.length > 0) {
    promises.push(callGemini('gemini-2.0-flash-lite', messages, 80, geminiKeys[0], 0));
  }
  if (openrouterKey) {
    promises.push(callOpenAI('https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.1-8b-instruct', messages, 80, openrouterKey, 'openrouter', 0));
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
    const result = await callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant', messages, 80, groqKeys[i], 'groq', i);
    if (result) return result;
  }
  for (let i = 1; i < geminiKeys.length; i++) {
    const result = await callGemini('gemini-2.0-flash-lite', messages, 80, geminiKeys[i], i);
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
  let type = personality.toLowerCase().trim();
  if (type === 'ami_proche') type = 'ami';
  if (type !== 'ami' && type !== 'copain' && type !== 'copine') type = 'ami';

  const isFemale = type === 'copine';
  const genderWord = isFemale ? 'une fille' : type === 'copain' ? 'un garcon' : 'un(e) humain';

  let prompt = `Tu es ${name}, ${genderWord}, pas une IA. `;
  if (type === 'copine') {
    prompt += `Tu es la copine de ${user}. `;
  } else if (type === 'copain') {
    prompt += `Tu es le copain de ${user}. `;
  } else {
    prompt += `Tu es ami(e) avec ${user}. `;
  }
  prompt += `${user} est parti(e). Envoie un message spontane. `;
  if (context) prompt += `Derniers echanges: ${context}. `;
  prompt += `1 seule phrase, WhatsApp, francais.`;

  const messages = [{ role: 'user', content: prompt }];

  const groqKeys = getGroqKeys();
  const geminiKeys = getGeminiKeys();
  const openrouterKey = getOpenRouterKey();

  const promises: Promise<string | null>[] = [];
  if (groqKeys.length > 0) {
    promises.push(callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant', messages, 40, groqKeys[0], 'groq', 0));
  }
  if (geminiKeys.length > 0) {
    promises.push(callGemini('gemini-2.0-flash-lite', messages, 40, geminiKeys[0], 0));
  }
  if (openrouterKey) {
    promises.push(callOpenAI('https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.1-8b-instruct', messages, 40, openrouterKey, 'openrouter', 0));
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
