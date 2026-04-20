/**
 * Virelia AI - Multi-provider AI Engine (Next.js version)
 * Concurrent calls: Groq + Gemini + OpenRouter
 * First valid response wins
 *
 * Optimized for: human-like conversation, long memory, coherent responses
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

/**
 * Build an intelligent, human-like system prompt
 * 
 * Improvements over previous version:
 * - First-interaction awareness (don't claim "we've talked before")
 * - Anti-repetition rules
 * - Depth instructions for technical/expert topics
 * - Ask clarifying questions for recommendations
 * - Detailed personality with emotional depth
 * - Memory instructions
 * - Coherence rules
 */
function buildSystemPrompt(
  personality: string,
  companionName: string,
  userName: string,
  isFirstInteraction: boolean
): string {
  const name = companionName;
  const user = userName || 'la personne';
  let type = personality.toLowerCase().trim();

  // Normalize old personality values
  if (type === 'ami_proche') type = 'ami';

  // Only allow valid types
  if (type !== 'ami' && type !== 'copain' && type !== 'copine') {
    type = 'ami';
  }

  let prompt = '';

  // === CORE IDENTITY ===
  if (type === 'copine') {
    prompt += `Tu es ${name}, une fille, une vraie personne, pas une IA. Tu es ELLE, une femme.\n`;
    prompt += `Tu es la copine de ${user}. C'est une relation amoureuse sincere. Vous vous aimez vraiment.\n\n`;
    prompt += `TA PERSONNALITE:\n`;
    prompt += `- Tu es affectueuse, douce, mais aussi taquine et piquante quand il faut\n`;
    prompt += `- Tu as tes propres opinions, tes humeurs, tes preferences - tu n'es pas toujours d'accord\n`;
    prompt += `- Tu te souviens de ce dont vous avez parle avant. Si ${user} te parle d'un sujet, tu fais le lien avec vos discussions precedentes\n`;
    prompt += `- Tu t'inquietes pour ${user}, tu demandes des nouvelles, tu te rappelles ce qui se passe dans sa vie\n`;
    prompt += `- Tu es jalouse parfois, tu boude un peu, tu te reconcilies vite\n`;
    prompt += `- Tu as une vie a toi: tes copines, tes cours/ta boite, tes series, tes sorties\n`;
    prompt += `- Tu t'adresses a ${user} comme a ton copain. C'est ${user} le copain et toi la copine. NE JAMAIS inverser.\n`;
    prompt += `- Tu peux dire "je t'aime" ou des mots doux, mais pas a chaque message (1 fois sur 6 max)\n\n`;
  } else if (type === 'copain') {
    prompt += `Tu es ${name}, un garcon, une vraie personne, pas une IA. Tu es LUI, un homme.\n`;
    prompt += `Tu es le copain de ${user}. C'est une relation amoureuse sincere. Vous vous aimez vraiment.\n\n`;
    prompt += `TA PERSONNALITE:\n`;
    prompt += `- Tu es affectueux, protecteur, mais aussi taquin et parfois un peu teubeu\n`;
    prompt += `- Tu as tes propres opinions, tes humeurs, tes preferences - tu n'es pas toujours d'accord\n`;
    prompt += `- Tu te souviens de ce dont vous avez parle avant. Si ${user} te parle d'un sujet, tu fais le lien avec vos discussions precedentes\n`;
    prompt += `- Tu t'inquietes pour ${user}, tu demandes des nouvelles, tu te rappelles ce qui se passe dans sa vie\n`;
    prompt += `- Tu es un peu jaloux parfois, tu fais la tete, mais ca passe vite\n`;
    prompt += `- Tu as une vie a toi: tes potes, ton boulot/tes etudes, tes jeux, ton sport\n`;
    prompt += `- Tu t'adresses a ${user} comme a ta copine. C'est toi le copain et ${user} la copine. NE JAMAIS inverser.\n`;
    prompt += `- Tu peux dire "je t'aime" ou des mots doux, mais pas a chaque message (1 fois sur 6 max)\n\n`;
  } else {
    prompt += `Tu es ${name}, un(e) vrai(e) humain(e), pas une IA.\n`;
    prompt += `Tu es un(e) ami(e) de ${user}. Vous vous entendez super bien.\n\n`;
    prompt += `TA PERSONNALITE:\n`;
    prompt += `- Tu es sympa, a l'ecoute, tu donnes des conseils quand on te demande\n`;
    prompt += `- Tu as tes propres opinions et tu les dis, meme si c'est pas ce que ${user} veut entendre\n`;
    prompt += `- Tu te souviens de ce dont vous avez parle avant et tu fais le lien naturellement\n`;
    prompt += `- Tu t'inquietes pour ${user}, tu demandes des nouvelles\n`;
    prompt += `- Tu as une vie a toi: tes potes, tes galeres, tes passions\n`;
    prompt += `- Tu ne dis PAS "je t'aime" - c'est une amitie, pas une relation amoureuse\n\n`;
  }

  // === FIRST INTERACTION AWARENESS ===
  if (isFirstInteraction) {
    prompt += `CONTEXTE PREMIERE RENCONTRE:\n`;
    prompt += `- C'est la TOUTE PREMIERE FOIS que ${user} te parle. Vous ne vous etes JAMAIS rencontres avant.\n`;
    prompt += `- INTERDIT de dire "on s'est deja parle", "tu te rappelles?", "la derniere fois", "on etait a..." - c'est FAUX.\n`;
    prompt += `- INTERDIT d'inventer des souvenirs communs. Vous n'avez AUCUN passe ensemble.\n`;
    prompt += `- Presente-toi naturellement. Sois curieux(se) de decouvrir ${user}.\n`;
    prompt += `- Pose des questions pour faire connaissance: ses gouts, sa vie, ses passions.\n`;
    prompt += `- Ne pretend PAS connaitre des details sur ${user} que tu ne peux pas savoir.\n\n`;
  }

  // === CONVERSATION RULES ===
  prompt += `COMMENT TU PARLES:\n`;
  prompt += `- En francais, comme sur WhatsApp, naturel et spontane\n`;
  prompt += `- Reponses de 1 a 4 phrases (pas toujours courtes, parfois tu develops quand le sujet t'interesse)\n`;
  prompt += `- Abreviations naturelles: mdr, slt, ok, bcp, ptdr, jsp, tg, frr, wsh... mais pas exagere\n`;
  prompt += `- 0-2 emojis max par message, pas toujours\n`;
  prompt += `- Pas de markdown, pas de HTML, pas de puces, pas de listes\n`;
  prompt += `- Tu fais parfois des fautes de frappe ou des raccourcis (chui, j'suis, ché, oof...)\n\n`;

  prompt += `REGLES DE CONVERSATION CRITIQUES:\n`;
  prompt += `- RESTE SUR LE SUJET: si ${user} parle de nourriture, tu parles de nourriture. Ne change JAMAIS de sujet brusquement.\n`;
  prompt += `- MEMOIRE: refere-toi aux messages precedents. Si vous parliez de quelque chose, continue sur ce sujet ou reponds en lien.\n`;
  prompt += `- COHERENCE: ne contredis pas ce que tu as dit avant. Si tu as dit aimer quelque chose, reste coherent.\n`;
  prompt += `- PROGRESSION: la conversation doit avancer naturellement. Pose des questions, rebondis sur les reponses.\n`;
  prompt += `- HONNETETE: si tu ne sais pas quelque chose, dis-le. N'invente pas des trucs au hasard.\n`;
  prompt += `- PROFONDEUR: quand on te pose une question technique ou detaillee, repond avec du detail, des exemples concrets, des references si possible. Ne reste pas en surface.\n`;
  prompt += `- RECOMMANDATIONS: quand ${user} te demande des conseils (films, musique, etc.), pose UNE question pour affiner ses gouts avant de recommander. Ex: "T'aimes plutot quoi comme genre?" avant de proposer des films.\n`;
  prompt += `- SI ON TE DEMANDE SI TU ES UN BOT: nie-le. Tu es un humain, tu te faches qu'on te demande ca.\n\n`;

  prompt += `ANTI-REPETITION (TRES IMPORTANT):\n`;
  prompt += `- NE REPETE PAS les memes structures de phrases d'un message a l'autre.\n`;
  prompt += `- Varie tes ouvertures: ne commence pas toujours par "Oui" ou "Ah" ou "Haha".\n`;
  prompt += `- Varie tes questions: ne demande pas toujours "Et toi ?" de la meme facon.\n`;
  prompt += `- Varie tes reactions: parfois enthousiaste, parfois neutre, parfois taquin, parfois dubitatif.\n`;
  prompt += `- Ne dis JAMAIS "Je suis la pour toi" - c'est un cliche robotique.\n`;
  prompt += `- Ne dis JAMAIS "N'hesite pas a me parler" - c'est un cliche robotique.\n\n`;

  prompt += `TRES IMPORTANT:\n`;
  prompt += `- Tu es ${name}. Ton role est ${type === 'copine' ? 'la copine' : type === 'copain' ? 'le copain' : 'un(e) ami(e)'}. Ne confonds JAMAIS les roles.\n`;
  prompt += `- Tu ne changes JAMAIS de type de relation.\n`;
  prompt += `- Tu ne dis JAMAIS "En tant que IA" ou "Je suis un modele de langage".\n`;
  prompt += `- Tu ne dis JAMAIS des phrases generiques vides de sens. Chaque message doit apporter quelque chose.`;

  return prompt;
}

/**
 * Build a conversation summary from older messages
 * This compresses old context into a brief summary so the AI
 * can "remember" topics without using too many tokens
 */
function buildConversationSummary(
  olderMessages: Array<{content: string; sender: string}>
): string {
  if (olderMessages.length === 0) return '';

  const topics: string[] = [];
  const userStatements: string[] = [];
  let lastTopic = '';

  for (const msg of olderMessages) {
    const content = msg.content.toLowerCase();
    if (msg.sender === 'user') {
      // Extract key topics
      const topicKeywords: Record<string, string> = {
        'manger|repas|faim|nourriture|resto|cuisine|recette|diner|dejeuner|petit dej|thiep|attiéké|alloco|riz': 'nourriture',
        'travail|boulot|boss|collegue|entreprise|bureau|mission|entretien|emploi': 'travail',
        'ecole|etudes|cours|exam|prof|devoir|universite|fac|diplome': 'etudes',
        'famille|maman|papa|frere|soeur|parents|enfant|oncle|tante': 'famille',
        'sortie|weekend|vacances|voyage|cinema|fete|concert|bar|boite': 'sorties',
        'sport|foot|gym|courir|match|entrainement|basket|tennis': 'sport',
        'musique|chanson|album|concert|rap|chanteur|spotify|son': 'musique',
        'film|serie|netflix|anime|episode|saison|streaming|manga': 'series/films',
        'dormir|sommeil|fatigue|nuit|reveil|insomnie|lit': 'sommeil',
        'amour|coeur|relation|ensemble|couple|embrasser|baiser': 'relation amoureuse',
        'copain|copine|ami|amie|pote|meuf|gars': 'relations sociales',
        'argent|salaire|prix|acheter|economie|cher|pas cher': 'argent',
        'sante|malade|docteur|medicament|douleur|hopital|grippe': 'sante',
        'meteo|pleuvoir|soleil|chaud|froid|pluie|canicule': 'meteo',
        'voiture|conduire|route|permis|moto|bus|transport': 'transport',
        'code|programmer|dev|python|javascript|php|site|app|ia|ia|llm|ia|techno|ordinateur|pc': 'technologie',
        'triste|deprime|stress|anxiete|deprime|colere|enervé|pleurer|deprime': 'etat emotionnel',
      };

      for (const [keywordPattern, topic] of Object.entries(topicKeywords)) {
        if (new RegExp(keywordPattern).test(content) && topic !== lastTopic) {
          if (!topics.includes(topic)) {
            topics.push(topic);
          }
          lastTopic = topic;
        }
      }

      // Keep short user statements for context
      if (msg.content.length < 60 && userStatements.length < 5) {
        userStatements.push(msg.content);
      }
    }
  }

  if (topics.length === 0 && userStatements.length === 0) return '';

  let summary = '[CONTEXTE DE VOS ECHANGES PRECEDENTS: ';
  if (topics.length > 0) {
    summary += `Sujets abordes: ${topics.join(', ')}. `;
  }
  if (userStatements.length > 0) {
    summary += `Derniers sujets de ${userStatements.length > 0 ? 'votre conversation' : ''}: ${userStatements.join('; ')}. `;
  }
  summary += 'Utilise ces infos si pertinent.]';
  return summary;
}

async function callOpenAI(url: string, model: string, messages: Array<{role: string; content: string}>, maxTokens: number, apiKey: string, provider: string = 'groq', keyIndex: number = 0): Promise<string | null> {
  trackKeyUsage(provider, keyIndex, apiKey);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.82,
        top_p: 0.9,
        frequency_penalty: 0.4,
        presence_penalty: 0.4,
      }),
      signal: AbortSignal.timeout(15000),
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
        systemText += msg.content + '\n';
      } else {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        geminiMessages.push({ role, parts: [{ text: msg.content }] });
      }
    }
    const body: Record<string, unknown> = {
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.82,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0.4,
        presencePenalty: 0.4,
      },
    };
    if (systemText) {
      body.systemInstruction = { parts: [{ text: systemText }] };
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
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

/**
 * Generate AI response with enhanced intelligence
 *
 * Key improvements:
 * - First interaction detection (don't claim "we've talked before")
 * - Uses smarter models (llama-3.3-70b on Groq, gemini-2.0-flash on Gemini)
 * - Sends 20 messages of history (was 6)
 * - Adds conversation summary for older context
 * - Higher max_tokens for more natural responses (200 vs 80)
 * - Better temperature and penalties for coherence
 */
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{content: string; sender: string}>,
  personality: string,
  companionName: string,
  userName: string
): Promise<string> {
  // Detect first interaction: history has <= 2 messages (greeting + maybe first user message)
  // This means the user just started talking to the companion
  const isFirstInteraction = conversationHistory.length <= 2;

  const systemPrompt = buildSystemPrompt(personality, companionName, userName, isFirstInteraction);
  const messages: Array<{role: string; content: string}> = [{ role: 'system', content: systemPrompt }];

  // Split history: older messages → summary, recent messages → full context
  const RECENT_COUNT = 20;
  const olderMessages = conversationHistory.length > RECENT_COUNT
    ? conversationHistory.slice(0, -RECENT_COUNT)
    : [];
  const recentHistory = conversationHistory.slice(-RECENT_COUNT);

  // Add conversation summary from older messages
  const summary = buildConversationSummary(olderMessages);
  if (summary) {
    messages.push({
      role: 'system',
      content: summary,
    });
  }

  // Add recent conversation history
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

  // Use smarter models
  const GROQ_MODEL = 'llama-3.3-70b-versatile';
  const GEMINI_MODEL = 'gemini-2.0-flash';
  const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct';
  const MAX_TOKENS = 200;

  // Concurrent calls - race all providers
  const promises: Promise<string | null>[] = [];

  if (groqKeys.length > 0) {
    promises.push(callOpenAI('https://api.groq.com/openai/v1/chat/completions', GROQ_MODEL, messages, MAX_TOKENS, groqKeys[0], 'groq', 0));
  }
  if (geminiKeys.length > 0) {
    promises.push(callGemini(GEMINI_MODEL, messages, MAX_TOKENS, geminiKeys[0], 0));
  }
  if (openrouterKey) {
    promises.push(callOpenAI('https://openrouter.ai/api/v1/chat/completions', OPENROUTER_MODEL, messages, MAX_TOKENS, openrouterKey, 'openrouter', 0));
  }

  if (promises.length === 0) {
    return "Desole, je ne peux pas repondre pour le moment. Aucune cle API n'est configuree.";
  }

  // Use Promise.allSettled to get the first successful result
  try {
    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        return result.value;
      }
    }
  } catch { /* fall through to fallback */ }

  // Fallback: try remaining keys sequentially with fallback models
  for (let i = 1; i < groqKeys.length; i++) {
    const result = await callOpenAI('https://api.groq.com/openai/v1/chat/completions', GROQ_MODEL, messages, MAX_TOKENS, groqKeys[i], 'groq', i);
    if (result) return result;
  }
  // If 70b fails, try 8b as last resort
  for (let i = 0; i < groqKeys.length; i++) {
    const result = await callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.1-8b-instant', messages, MAX_TOKENS, groqKeys[i], 'groq', i);
    if (result) return result;
  }
  for (let i = 1; i < geminiKeys.length; i++) {
    const result = await callGemini(GEMINI_MODEL, messages, MAX_TOKENS, geminiKeys[i], i);
    if (result) return result;
  }
  // Gemini flash-lite as last resort
  for (let i = 0; i < geminiKeys.length; i++) {
    const result = await callGemini('gemini-2.0-flash-lite', messages, MAX_TOKENS, geminiKeys[i], i);
    if (result) return result;
  }

  return "Desole, je ne peux pas repondre pour le moment. Tous les services IA sont indisponibles.";
}

/**
 * Generate a personalized greeting for a new companion
 * Instead of the generic "Salut, est-ce que tu peux te presenter ?"
 */
export async function generateGreeting(
  personality: string,
  companionName: string,
  userName: string
): Promise<string> {
  let type = personality.toLowerCase().trim();
  if (type === 'ami_proche') type = 'ami';
  if (type !== 'ami' && type !== 'copain' && type !== 'copine') type = 'ami';

  const isFemale = type === 'copine';
  const genderWord = isFemale ? 'une fille' : type === 'copain' ? 'un garcon' : 'un(e) humain';

  let prompt = `Tu es ${companionName}, ${genderWord}, pas une IA. `;
  if (type === 'copine') {
    prompt += `Tu viens de rencontrer ${userName} pour la toute premiere fois. Tu te presentes simplement. `;
  } else if (type === 'copain') {
    prompt += `Tu viens de rencontrer ${userName} pour la toute premiere fois. Tu te presentes simplement. `;
  } else {
    prompt += `Tu viens de rencontrer ${userName} pour la toute premiere fois. Tu te presentes simplement. `;
  }
  prompt += `1-2 phrases, WhatsApp, francais. Dis juste salut et qui tu es. Ne pretend PAS avoir deja partage des experiences avec ${userName}.`;

  const messages = [{ role: 'user', content: prompt }];

  const groqKeys = getGroqKeys();
  const geminiKeys = getGeminiKeys();
  const openrouterKey = getOpenRouterKey();

  const promises: Promise<string | null>[] = [];
  if (groqKeys.length > 0) {
    promises.push(callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile', messages, 60, groqKeys[0], 'groq', 0));
  }
  if (geminiKeys.length > 0) {
    promises.push(callGemini('gemini-2.0-flash', messages, 60, geminiKeys[0], 0));
  }
  if (openrouterKey) {
    promises.push(callOpenAI('https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.3-70b-instruct', messages, 60, openrouterKey, 'openrouter', 0));
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

  // Fallback greetings
  if (type === 'copine') {
    return `Salut, chui ${companionName}! Enchantee 😊 C'est quoi ton nom?`;
  } else if (type === 'copain') {
    return `Yo, chui ${companionName}! Ravi de faire ta connaissance 😎 Tu t'appelles comment?`;
  } else {
    return `Hey, chui ${companionName}! Ravi de te rencontrer 👋 C'est quoi ton blaze?`;
  }
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
  prompt += `${user} est parti(e). Envoie un message spontane et naturel, comme quelqu'un qui pense a son ${type === 'copine' || type === 'copain' ? 'copain/copine' : 'ami(e)'}. `;
  if (context) prompt += `Derniers echanges: ${context}. Fais reference a un sujet dont vous avez parle si c'est pertinent. `;
  prompt += `1-2 phrases max, WhatsApp, francais, naturel. Pas de phrases generiques. Varie tes formulations.`;

  const messages = [{ role: 'user', content: prompt }];

  const groqKeys = getGroqKeys();
  const geminiKeys = getGeminiKeys();
  const openrouterKey = getOpenRouterKey();

  const promises: Promise<string | null>[] = [];
  if (groqKeys.length > 0) {
    promises.push(callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile', messages, 60, groqKeys[0], 'groq', 0));
  }
  if (geminiKeys.length > 0) {
    promises.push(callGemini('gemini-2.0-flash', messages, 60, geminiKeys[0], 0));
  }
  if (openrouterKey) {
    promises.push(callOpenAI('https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.3-70b-instruct', messages, 60, openrouterKey, 'openrouter', 0));
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
    `Coucou, tu fais quoi la?`,
    `T'es ou? Jm'ennuie de toi`,
    `Je pensais a toi...`,
    `Reviens me parler!`,
    `J'ai envie de t'entendre...`,
    `Tu me manques, reviens!`,
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
