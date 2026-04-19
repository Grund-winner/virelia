import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'users') {
      const users = await db.user.findMany({
        orderBy: { lastActive: 'desc' },
        select: {
          id: true, username: true, displayName: true, avatar: true,
          createdAt: true, lastActive: true,
          _count: { select: { companions: true, messages: true } },
        },
      });

      const usersData = users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        createdAt: u.createdAt.toISOString(),
        lastActive: u.lastActive.toISOString(),
        companionCount: u._count.companions,
        messageCount: u._count.messages,
      }));

      return NextResponse.json({ success: true, users: usersData });
    }

    if (action === 'user_companions') {
      const userId = searchParams.get('user_id');
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID invalide' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { username: true, displayName: true, avatar: true },
      });

      const companions = await db.companion.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      const companionsWithData = await Promise.all(
        companions.map(async (c) => {
          const msgCount = await db.message.count({ where: { companionId: c.id } });
          const lastMsg = await db.message.findFirst({
            where: { companionId: c.id },
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true },
          });
          return {
            id: c.id,
            name: c.name,
            avatar: c.avatar,
            personality: c.personality,
            greeting: c.greeting,
            isActive: c.isActive,
            createdAt: c.createdAt.toISOString(),
            messageCount: msgCount,
            lastMessage: lastMsg ? lastMsg.content.substring(0, 40) : (c.greeting || ''),
            lastTime: lastMsg ? lastMsg.createdAt.toISOString() : c.createdAt.toISOString(),
          };
        })
      );

      return NextResponse.json({ success: true, companions: companionsWithData, user });
    }

    if (action === 'conversation') {
      const companionId = searchParams.get('companion_id');
      if (!companionId) {
        return NextResponse.json({ success: false, error: 'Companion ID invalide' }, { status: 400 });
      }

      const companion = await db.companion.findUnique({
        where: { id: companionId },
        include: { user: { select: { id: true, username: true, displayName: true } } },
      });

      if (!companion) {
        return NextResponse.json({ success: false, error: 'Compagnon introuvable' }, { status: 404 });
      }

      const messages = await db.message.findMany({
        where: { companionId },
        orderBy: { createdAt: 'asc' },
      });

      return NextResponse.json({
        success: true,
        companion: {
          id: companion.id,
          name: companion.name,
          avatar: companion.avatar,
          personality: companion.personality,
          username: companion.user.username,
          displayName: companion.user.displayName,
          userId: companion.user.id,
        },
        messages: messages.map(m => ({
          id: m.id,
          content: m.content,
          sender: m.sender,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'delete_user') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID invalide' }, { status: 400 });
      }

      await db.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
