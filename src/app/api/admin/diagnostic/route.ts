import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getProviderStatus } from '@/lib/ai';

export async function GET() {
  try {
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const status = getProviderStatus();
    return NextResponse.json({ success: true, providers: status });
  } catch (error) {
    console.error('Admin diagnostic error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
