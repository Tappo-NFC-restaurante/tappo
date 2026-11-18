import { prisma } from '../prisma';
import { CallType } from '@prisma/client';

const SPAM_WINDOW_SECONDS = 60;

/**
 * Verifica se já existe um chamado recente do mesmo tipo na mesma sessão
 * nos últimos 60 segundos.
 */
export async function checkCallAntiSpam(
  sessionId: string,
  type: CallType
): Promise<{ allowed: boolean; remainingSeconds?: number }> {
  const sixtySecondsAgo = new Date(Date.now() - SPAM_WINDOW_SECONDS * 1000);

  const recentCall = await prisma.tableCall.findFirst({
    where: {
      session_id: sessionId,
      type,
      created_at: {
        gte: sixtySecondsAgo,
      },
      status: {
        in: ['PENDING', 'ACKNOWLEDGED'],
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  if (!recentCall) {
    return { allowed: true };
  }

  const elapsedSeconds = Math.floor((Date.now() - recentCall.created_at.getTime()) / 1000);
  const remainingSeconds = Math.max(0, SPAM_WINDOW_SECONDS - elapsedSeconds);

  return {
    allowed: false,
    remainingSeconds,
  };
}
