import { NextRequest, NextResponse } from 'next/server';
import { getAdminPassword, createAdminSession, isAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === getAdminPassword()) {
      const token = await createAdminSession();
      const response = NextResponse.json({ success: true });
      response.cookies.set('virelia_admin', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ success: false, error: 'Mot de passe incorrect' }, { status: 401 });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const adminStatus = await isAdmin();
    return NextResponse.json({ isAdmin: adminStatus });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
