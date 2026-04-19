import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { generateAIResponse, generateProactiveMessage } from '@/lib/ai';

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non connecte' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companionId = searchParams.get('companion_id');
    const lastId = searchParams.get('last_id');

    if (!companionId) {
      return NextResponse.json({ success: false, error: 'companion_id requis' }, { status: 400 });
    }

    // Verify companion belongs to user
    const companion = await db.companion.findFirst({
      where: { id: companionId, userId, isActive: true },
      select: { id: true, name: true, avatar: true },
    });
    if (!companion) {
      return NextResponse.json({ success: false, error: 'Compagnon introuvable' }, { status: 404 });
    }

    // Check for pending proactive messages
    const now = new Date();
    const pendingProactive = await db.proactiveQueue.findMany({
      where: { companionId, userId, sent: false, scheduledAt: { lte: now } },
    });

    for (const item of pendingProactive) {
      await db.message.create({
        data: { companionId, userId, content: item.message, sender: 'companion' },
      });
      await db.proactiveQueue.update({ where: { id: item.id }, data: { sent: true } });
    }

    // Fetch messages
    let messages;
    if (lastId) {
      const lastMessage = await db.message.findUnique({ where: { id: lastId } });
      if (lastMessage) {
        messages = await db.message.findMany({
          where: { companionId, userId, createdAt: { gt: lastMessage.createdAt } },
          orderBy: { createdAt: 'asc' },
        });
      } else {
        messages = [];
      }
    } else {
      messages = await db.message.findMany({
        where: { companionId, userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      messages = messages.reverse();
    }

    // Update last active
    await db.user.update({ where: { id: userId }, data: { lastActive: new Date() } });

    return NextResponse.json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        createdAt: m.createdAt.toISOString(),
      })),
      companion: lastId ? undefined : companion,
    });
  } catch (error) {
    console.error('Messages GET error:', error);
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
    const { companion_id, message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: 'Message vide' }, { status: 400 });
    }

    // Verify companion
    const companion = await db.companion.findFirst({
      where: { id: companion_id, userId, isActive: true },
    });
    if (!companion) {
      return NextResponse.json({ success: false, error: 'Compagnon introuvable' }, { status: 404 });
    }

    // Get user info
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Save user message
    const userMsg = await db.message.create({
      data: { companionId: companion_id, userId, content: message.trim(), sender: 'user' },
    });

    // Get conversation history (50 messages for better memory context)
    const history = await db.message.findMany({
      where: { companionId: companion_id, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { content: true, sender: true },
    });

    // Generate AI response
    const aiResponse = await generateAIResponse(
      message.trim(),
      history.reverse(),
      companion.personality,
      companion.name,
      user.displayName || user.username
    );

    // Save AI response
    const aiMsg = await db.message.create({
      data: { companionId: companion_id, userId, content: aiResponse, sender: 'companion' },
    });

    // Update last active
    await db.user.update({ where: { id: userId }, data: { lastActive: new Date() } });

    // Schedule proactive message
    try {
      // Remove existing unsent proactive messages
      await db.proactiveQueue.deleteMany({
        where: { companionId: companion_id, userId, sent: false },
      });

      const minDelay = 3600 * 1000; // 1 hour
      const maxDelay = 10800 * 1000; // 3 hours
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      const scheduledAt = new Date(Date.now() + delay);

      // Get recent context for proactive message
      const recentMsgs = await db.message.findMany({
        where: { companionId: companion_id, userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { content: true },
      });
      const context = recentMsgs.map(m => m.content).join(' | ');

      const proactiveMsg = await generateProactiveMessage(
        companion.personality,
        companion.name,
        user.displayName || user.username,
        context
      );

      await db.proactiveQueue.create({
        data: {
          companionId: companion_id,
          userId,
          message: proactiveMsg,
          scheduledAt,
        },
      });
    } catch (pe) {
      // Proactive scheduling failure should NOT block the message
      console.error('Proactive error (non-blocking):', pe);
    }

    return NextResponse.json({
      success: true,
      userMessage: {
        id: userMsg.id,
        content: userMsg.content,
        sender: 'user',
        createdAt: userMsg.createdAt.toISOString(),
      },
      aiMessage: {
        id: aiMsg.id,
        content: aiMsg.content,
        sender: 'companion',
        createdAt: aiMsg.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de l\'envoi' }, { status: 500 });
  }
}
