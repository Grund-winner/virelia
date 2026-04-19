import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getProviderStatus, getKeyUsageStats } from '@/lib/ai';

export async function GET() {
  try {
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const status = getProviderStatus();
    const usage = getKeyUsageStats();

    // Transform into the format the frontend expects
    const providers = [
      {
        name: 'Groq',
        configured: status.groq_keys > 0,
        keyCount: status.groq_keys,
        details: status.groq_keys > 0 ? `${status.groq_keys} clé(s) configurée(s)` : 'Aucune clé configurée',
      },
      {
        name: 'Gemini',
        configured: status.gemini_keys > 0,
        keyCount: status.gemini_keys,
        details: status.gemini_keys > 0 ? `${status.gemini_keys} clé(s) configurée(s)` : 'Aucune clé configurée',
      },
      {
        name: 'OpenRouter',
        configured: status.openrouter,
        keyCount: status.openrouter ? 1 : 0,
        details: status.openrouter ? 'Clé configurée' : 'Aucune clé configurée',
      },
    ];

    return NextResponse.json({
      success: true,
      providers,
      usage,
    });
  } catch (error) {
    console.error('Admin diagnostic error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
