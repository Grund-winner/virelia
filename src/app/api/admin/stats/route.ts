import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [users, companions, messages] = await Promise.all([
      db.user.count(),
      db.companion.count(),
      db.message.count(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessages = await db.message.count({
      where: { createdAt: { gte: today } },
    });

    return NextResponse.json({
      success: true,
      stats: { users, companions, messages, today: todayMessages },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
