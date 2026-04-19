import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non connecte' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatar: true, bio: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non connecte' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'update_profile') {
      const { displayName, bio, avatar } = body;
      const updateData: Record<string, string> = {};

      if (displayName !== undefined) updateData.displayName = displayName.trim();
      if (bio !== undefined) updateData.bio = bio.trim();
      if (avatar !== undefined) updateData.avatar = avatar;

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ success: false, error: 'Rien a mettre a jour' }, { status: 400 });
      }

      await db.user.update({ where: { id: userId }, data: updateData });
      return NextResponse.json({ success: true });
    }

    if (action === 'change_password') {
      const { currentPassword, newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Mot de passe trop court (6 min)' }, { status: 400 });
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return NextResponse.json({ success: false, error: 'Mot de passe actuel incorrect' }, { status: 401 });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await db.user.update({ where: { id: userId }, data: { password: hash } });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_account') {
      const { password } = body;
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ success: false, error: 'Mot de passe incorrect' }, { status: 401 });
      }

      await db.user.delete({ where: { id: userId } });
      const response = NextResponse.json({ success: true });
      response.cookies.set('virelia_session', '', { maxAge: 0, path: '/' });
      return response;
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
