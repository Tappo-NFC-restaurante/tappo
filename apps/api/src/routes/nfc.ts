import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { emitToTenant } from '../socket';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /m/:nfcToken
 * Ponto de entrada escaneado na tag NFC física fixada na mesa
 */
router.get('/m/:nfcToken', async (req: Request, res: Response) => {
  const { nfcToken } = req.params;

  try {
    // 1. Busca a mesa pelo token físico gravado no chip NFC
    const table = await prisma.table.findUnique({
      where: { nfc_token: nfcToken },
      include: {
        tenant: true,
      },
    });

    if (!table) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>tappo — Mesa não encontrada</title>
          <style>
            body { background: #141212; color: #FFFFFF; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
            .card { background: #1C1818; padding: 32px 24px; border-radius: 20px; max-width: 380px; border: 1px solid #2E2929; }
            h1 { color: #EA1D2C; margin-top: 0; }
            p { color: #A1A1AA; line-height: 1.5; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Tag NFC Inválida</h1>
            <p>Esta tag de mesa não está vinculada a nenhum restaurante cadastrado no <strong>tappo</strong>.</p>
            <p style="font-size: 13px; color: #71717A;">Token: ${nfcToken}</p>
          </div>
        </body>
        </html>
      `);
    }

    if (!table.active || !table.tenant.active) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>tappo — Mesa Inativa</title>
          <style>
            body { background: #0D0D0F; color: #F7F9FA; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
            .card { background: #18181B; padding: 32px 24px; border-radius: 20px; max-width: 380px; border: 1px solid #27272A; }
            h1 { color: #EF4444; margin-top: 0; }
            p { color: #A1A1AA; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Mesa Desativada</h1>
            <p>Esta mesa ou o restaurante está temporariamente indisponível no momento.</p>
          </div>
        </body>
        </html>
      `);
    }

    // 2. Busca se já existe uma sessão OPEN para esta mesa
    let session = await prisma.tableSession.findFirst({
      where: {
        table_id: table.id,
        status: 'OPEN',
      },
      orderBy: {
        opened_at: 'desc',
      },
    });

    let isNewSession = false;

    // Se não existir sessão aberta, cria uma nova com session_token UUID
    if (!session) {
      session = await prisma.tableSession.create({
        data: {
          table_id: table.id,
          tenant_id: table.tenant_id,
          session_token: uuidv4(),
          status: 'OPEN',
        },
      });
      isNewSession = true;
    }

    // 3. Grava session_token em cookie HttpOnly com validade de 3 horas
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    res.cookie('tappo_session', session.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: THREE_HOURS_MS,
      path: '/',
    });

    // 4. Emite via Socket.io evento 'session:active' para a sala do restaurante
    emitToTenant(table.tenant_id, 'session:active', {
      tableId: table.id,
      tableLabel: table.label,
      sessionId: session.id,
      sessionToken: session.session_token,
      openedAt: session.opened_at,
      isNewSession,
    });

    // Redireciona para o cardápio do restaurante (ocultando o nfc_token da barra de endereços)
    const clientBaseUrl =
      process.env.CLIENT_URL !== undefined
        ? process.env.CLIENT_URL
        : process.env.NODE_ENV === 'production'
        ? ''
        : 'http://localhost:5173';
    const redirectUrl = `${clientBaseUrl}/${table.tenant.slug}/cardapio?st=${session.session_token}`;

    // Se a requisição pedir JSON (ex: fetch)
    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        redirectUrl,
        sessionToken: session.session_token,
        tenantSlug: table.tenant.slug,
        tableLabel: table.label,
      });
    }

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Erro ao processar leitura de tag NFC:', error);
    return res.status(500).send('Erro interno ao ler tag NFC da mesa');
  }
});

export default router;
