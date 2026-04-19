import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non connecte' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      const companions = await db.companion.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      const companionsWithLastMsg = await Promise.all(
        companions.map(async (c) => {
          const lastMsg = await db.message.findFirst({
            where: { companionId: c.id, userId },
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true },
          });
          return {
            ...c,
            lastMessage: lastMsg ? lastMsg.content.substring(0, 40) : c.greeting,
            lastTime: lastMsg ? lastMsg.createdAt.toISOString() : c.createdAt.toISOString(),
          };
        })
      );

      return NextResponse.json({ success: true, companions: companionsWithLastMsg });
    }

    if (action === 'get') {
      const companionId = searchParams.get('id');
      if (!companionId) {
        return NextResponse.json({ success: false, error: 'ID manquant' }, { status: 400 });
      }
      const companion = await db.companion.findFirst({
        where: { id: companionId, userId },
      });
      if (!companion) {
        return NextResponse.json({ success: false, error: 'Compagnon introuvable' }, { status: 404 });
      }
      return NextResponse.json({ success: true, companion });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Companions GET error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non connecte' }, { status: 401 });
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'create') {
      const name = (formData.get('name') as string)?.trim();
      const personality = (formData.get('personality') as string)?.trim() || 'ami';
      const avatar = formData.get('avatar') as string || '';

      if (!name) {
        return NextResponse.json({ success: false, error: 'Le nom est requis' }, { status: 400 });
      }

      const validPersonality = ['ami', 'ami_proche', 'copain', 'copine'].includes(personality) ? personality : 'ami';

      const companion = await db.companion.create({
        data: {
          userId,
          name,
          personality: validPersonality,
          avatar: avatar || '',
          greeting: '',
        },
      });

      // Send first message from companion
      await db.message.create({
        data: {
          companionId: companion.id,
          userId,
          content: 'Salut, est-ce que tu peux te presenter ?',
          sender: 'companion',
        },
      });

      return NextResponse.json({ success: true, companionId: companion.id });
    }

    if (action === 'update') {
      const companionId = formData.get('companion_id') as string;
      if (!companionId) {
        return NextResponse.json({ success: false, error: 'ID manquant' }, { status: 400 });
      }

      const existing = await db.companion.findFirst({ where: { id: companionId, userId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Compagnon introuvable' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      if (formData.has('name')) updateData.name = (formData.get('name') as string)?.trim();
      if (formData.has('personality')) {
        const p = (formData.get('personality') as string)?.trim();
        updateData.personality = ['ami', 'ami_proche', 'copain', 'copine'].includes(p || '') ? p : 'ami';
      }
      if (formData.has('avatar')) updateData.avatar = formData.get('avatar') as string;

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ success: false, error: 'Rien a mettre a jour' }, { status: 400 });
      }

      await db.companion.update({ where: { id: companionId }, data: updateData });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const companionId = formData.get('companion_id') as string;
      if (!companionId) {
        return NextResponse.json({ success: false, error: 'ID manquant' }, { status: 400 });
      }

      const existing = await db.companion.findFirst({ where: { id: companionId, userId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Compagnon introuvable' }, { status: 404 });
      }

      await db.companion.delete({ where: { id: companionId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Companions POST error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
