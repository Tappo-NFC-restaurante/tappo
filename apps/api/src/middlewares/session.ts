import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { TableSession, Table, Tenant } from '@prisma/client';

export interface AuthenticatedTableSession extends TableSession {
  table: Table;
  tenant: Tenant;
}

declare global {
  namespace Express {
    interface Request {
      tableSession?: AuthenticatedTableSession;
    }
  }
}

export async function requireActiveTableSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Lê do cookie HttpOnly 'tappo_session' ou fallback para header 'x-session-token'
  const sessionToken =
    req.cookies?.tappo_session ||
    (req.headers['x-session-token'] as string) ||
    (req.query?.session_token as string);

  if (!sessionToken) {
    return res.status(401).json({
      error: 'Sessão da mesa não encontrada. Aproxime novamente o celular da tag NFC da mesa.',
      code: 'NO_SESSION',
    });
  }

  try {
    const session = await prisma.tableSession.findUnique({
      where: { session_token: sessionToken },
      include: {
        table: true,
        tenant: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Sessão inválida ou expirada. Aproxime o celular da tag NFC da mesa.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    if (session.status !== 'OPEN') {
      return res.status(403).json({
        error: 'Esta sessão de mesa já foi encerrada pelo restaurante. Aproxime da tag NFC para iniciar uma nova.',
        code: 'SESSION_CLOSED',
      });
    }

    if (!session.table.active) {
      return res.status(403).json({
        error: 'Esta mesa está temporariamente inativa.',
        code: 'TABLE_INACTIVE',
      });
    }

    req.tableSession = session as AuthenticatedTableSession;
    return next();
  } catch (error) {
    console.error('Erro ao verificar sessão da mesa:', error);
    return res.status(500).json({ error: 'Erro interno ao validar sessão da mesa' });
  }
}
