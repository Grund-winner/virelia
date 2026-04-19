import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ loggedIn: false }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatar: true, bio: true, createdAt: true, lastActive: true },
    });

    if (!user) {
      return NextResponse.json({ loggedIn: false }, { status: 401 });
    }

    return NextResponse.json({ loggedIn: true, user });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}
