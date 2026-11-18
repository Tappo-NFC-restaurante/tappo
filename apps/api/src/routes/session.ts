import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireActiveTableSession } from '../middlewares/session';
import { checkCallAntiSpam } from '../utils/antiSpam';
import { verifyGeofence } from '../utils/geofence';
import { emitToTenant, emitToSession } from '../socket';
import { CallType, PaymentMethod } from '@prisma/client';

const router = Router();

// Todas as rotas deste router exigem sessão de mesa ativa
router.use(requireActiveTableSession);

/**
 * GET /api/session/current
 * Retorna os dados da sessão atual da mesa, restaurante, pedidos e chamados ativos
 */
router.get('/current', async (req: Request, res: Response) => {
  const session = req.tableSession!;

  try {
    const orders = await prisma.order.findMany({
      where: { session_id: session.id },
      include: {
        items: {
          include: {
            menu_item: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const calls = await prisma.tableCall.findMany({
      where: {
        session_id: session.id,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json({
      session: {
        id: session.id,
        session_token: session.session_token,
        status: session.status,
        opened_at: session.opened_at,
      },
      table: {
        id: session.table.id,
        label: session.table.label,
      },
      tenant: {
        id: session.tenant.id,
        name: session.tenant.name,
        slug: session.tenant.slug,
        subtitle: session.tenant.subtitle,
        logo_url: session.tenant.logo_url,
        cover_url: session.tenant.cover_url,
        has_geofencing: Boolean(session.tenant.latitude && session.tenant.longitude),
      },
      orders,
      activeCalls: calls,
    });
  } catch (error) {
    console.error('Erro ao buscar dados da sessão atual:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da sessão' });
  }
});

/**
 * POST /api/session/orders
 * Envio de novo pedido pela mesa
 */
router.post('/orders', async (req: Request, res: Response) => {
  const session = req.tableSession!;
  const { items, clientCoords } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Nenhum item informado para o pedido' });
  }

  try {
    // 1. Busca os pratos no banco e valida disponibilidade
    const itemIds = items.map((i: any) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        tenant_id: session.tenant_id,
      },
    });

    if (dbMenuItems.length !== itemIds.length) {
      return res.status(400).json({ error: 'Um ou mais itens selecionados não foram encontrados' });
    }

    // Valida itens esgotados
    const unavailableItems = dbMenuItems.filter((item) => !item.is_available);
    if (unavailableItems.length > 0) {
      return res.status(400).json({
        error: `O item "${unavailableItems[0].name}" está esgotado no momento.`,
      });
    }

    const menuMap = new Map(dbMenuItems.map((item) => [item.id, item]));

    // 2. Calcula valor total
    let totalCents = 0;
    const orderItemsToCreate = items.map((inputItem: any) => {
      const dbItem = menuMap.get(inputItem.menuItemId)!;
      const quantity = Math.max(1, parseInt(inputItem.quantity, 10) || 1);
      const unitPriceCents = dbItem.price_cents;
      totalCents += unitPriceCents * quantity;

      return {
        menu_item_id: dbItem.id,
        quantity,
        unit_price_cents: unitPriceCents,
      };
    });

    // 3. Geofencing (Anti-trollagem remota)
    const geofenceResult = verifyGeofence(
      clientCoords,
      {
        latitude: session.tenant.latitude,
        longitude: session.tenant.longitude,
      },
      session.tenant.radius_meters
    );

    // 4. Cria o pedido no banco
    const order = await prisma.order.create({
      data: {
        session_id: session.id,
        tenant_id: session.tenant_id,
        table_id: session.table_id,
        status: 'PENDING',
        total_cents: totalCents,
        location_verified: geofenceResult.verified,
        items: {
          create: orderItemsToCreate,
        },
      },
      include: {
        items: {
          include: {
            menu_item: true,
          },
        },
        table: true,
      },
    });

    // 5. Emite em tempo real para o painel do chefe
    emitToTenant(session.tenant_id, 'order:created', {
      order,
      tableLabel: session.table.label,
      geofence: geofenceResult,
    });

    return res.status(201).json({
      success: true,
      order,
      geofence: geofenceResult,
    });
  } catch (error) {
    console.error('Erro ao registrar pedido:', error);
    return res.status(500).json({ error: 'Erro interno ao processar pedido' });
  }
});

/**
 * POST /api/session/calls
 * Chamar Garçom ou Pedir Conta
 */
router.post('/calls', async (req: Request, res: Response) => {
  const session = req.tableSession!;
  const { type, reason, paymentMethod, includeTip, estimatedTotalCents } = req.body;

  if (!type || !['WAITER', 'BILL'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de chamado inválido. Use WAITER ou BILL' });
  }

  const callType = type as CallType;

  // 1. Trava Anti-Spam: Impede chamados do mesmo tipo em menos de 60 segundos
  const spamCheck = await checkCallAntiSpam(session.id, callType);
  if (!spamCheck.allowed) {
    return res.status(429).json({
      error: `Por favor, aguarde ${spamCheck.remainingSeconds}s antes de enviar outro chamado de ${
        callType === 'WAITER' ? 'garçom' : 'conta'
      }.`,
      remainingSeconds: spamCheck.remainingSeconds,
    });
  }

  try {
    // 2. Persiste chamado
    const call = await prisma.tableCall.create({
      data: {
        session_id: session.id,
        tenant_id: session.tenant_id,
        table_id: session.table_id,
        type: callType,
        reason: reason || null,
        payment_method: (paymentMethod as PaymentMethod) || null,
        include_tip: Boolean(includeTip),
        estimated_total_cents: estimatedTotalCents ? parseInt(estimatedTotalCents, 10) : null,
        status: 'PENDING',
      },
      include: {
        table: true,
      },
    });

    // 3. Emite WebSocket imediato para o painel do restaurante
    emitToTenant(session.tenant_id, 'call:created', {
      call,
      tableLabel: session.table.label,
    });

    return res.status(201).json({
      success: true,
      call,
      message:
        callType === 'WAITER'
          ? 'Garçom notificado! Já estamos a caminho da sua mesa.'
          : 'Conta solicitada! O atendente levará a maquininha até você.',
    });
  } catch (error) {
    console.error('Erro ao registrar chamado:', error);
    return res.status(500).json({ error: 'Erro interno ao registrar chamado' });
  }
});

export default router;
