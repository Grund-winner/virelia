import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'register') {
      const { username, password, confirm } = body;
      if (!username || !password) {
        return NextResponse.json({ success: false, error: 'Remplissez tous les champs' }, { status: 400 });
      }
      if (username.length < 3) {
        return NextResponse.json({ success: false, error: 'Nom trop court (3 min)' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: 'Mot de passe trop court (6 min)' }, { status: 400 });
      }
      if (password !== confirm) {
        return NextResponse.json({ success: false, error: 'Mots de passe differents' }, { status: 400 });
      }

      const existing = await db.user.findUnique({ where: { username } });
      if (existing) {
        return NextResponse.json({ success: false, error: 'Ce nom est deja pris' }, { status: 409 });
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await db.user.create({
        data: { username, password: hash, displayName: username },
      });

      const token = await createSession(user.id);
      const response = NextResponse.json({ success: true });
      response.cookies.set('virelia_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
      return response;
    }

    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ success: false, error: 'Remplissez tous les champs' }, { status: 400 });
      }

      const user = await db.user.findUnique({ where: { username } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ success: false, error: 'Identifiants incorrects' }, { status: 401 });
      }

      await db.user.update({ where: { id: user.id }, data: { lastActive: new Date() } });

      const token = await createSession(user.id);
      const response = NextResponse.json({ success: true });
      response.cookies.set('virelia_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
      return response;
    }

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.set('virelia_session', '', { maxAge: 0, path: '/' });
      return response;
    }

    if (action === 'check') {
      // This will be handled by the session check route
      return NextResponse.json({ success: false, error: 'Use GET /api/auth/me' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
