import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateJwt, requireRole } from '../middlewares/auth';
import { emitToTenant, emitToSession } from '../socket';

const router = Router();

// Exige autenticação e papel de dono de restaurante ou staff (ou super admin simulando)
router.use(authenticateJwt);
router.use(requireRole(['RESTAURANT_OWNER', 'STAFF', 'SUPER_ADMIN']));

// Middleware para resolver tenant_id correto (se super_admin passar ?tenantId, ou usar o próprio)
function getTenantId(req: Request): string {
  if (req.user?.role === 'SUPER_ADMIN' && req.query.tenantId) {
    return req.query.tenantId as string;
  }
  if (!req.user?.tenantId) {
    throw new Error('Tenant não vinculado a este usuário');
  }
  return req.user.tenantId;
}

function getBaseUrl(req: Request): string {
  if (process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
    return process.env.BASE_URL;
  }
  const host = req.get('host');
  const protocol =
    req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
      ? 'https'
      : 'http';
  return `${protocol}://${host}`;
}

/**
 * GET /api/restaurant/dashboard
 * Retorna os dados em tempo real do salão: mesas, pedidos pendentes, chamados
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const baseUrl = getBaseUrl(req);

    // 1. Busca todas as mesas do restaurante com sua sessão aberta atual (se houver)
    const tables = await prisma.table.findMany({
      where: { tenant_id: tenantId, active: true },
      orderBy: { label: 'asc' },
      include: {
        sessions: {
          where: { status: 'OPEN' },
          orderBy: { opened_at: 'desc' },
          take: 1,
          include: {
            orders: {
              where: { status: { in: ['PENDING', 'PREPARING'] } },
              select: { id: true, status: true, total_cents: true },
            },
            calls: {
              where: { status: { in: ['PENDING', 'ACKNOWLEDGED'] } },
              select: { id: true, type: true, status: true },
            },
          },
        },
      },
    });

    // 2. Fila de pedidos ativos
    const activeOrders = await prisma.order.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['PENDING', 'PREPARING'] },
      },
      include: {
        table: true,
        items: {
          include: {
            menu_item: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // 3. Fila de chamados de garçom e conta
    const activeCalls = await prisma.tableCall.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
      include: {
        table: true,
        session: {
          include: {
            orders: {
              include: {
                items: {
                  include: { menu_item: true },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // Mapeamento formatado do grid de mesas
    const formattedTables = tables.map((t) => {
      const activeSession = t.sessions[0] || null;
      const pendingOrdersCount = activeSession ? activeSession.orders.length : 0;
      const pendingCallsCount = activeSession ? activeSession.calls.length : 0;
      const hasBillRequest = activeSession
        ? activeSession.calls.some((c) => c.type === 'BILL')
        : false;

      return {
        id: t.id,
        label: t.label,
        nfc_token: t.nfc_token,
        nfc_url: `${baseUrl}/m/${t.nfc_token}`,
        active: t.active,
        hasActiveSession: Boolean(activeSession),
        activeSession: activeSession
          ? {
              id: activeSession.id,
              opened_at: activeSession.opened_at,
              pendingOrdersCount,
              pendingCallsCount,
              hasBillRequest,
            }
          : null,
      };
    });

    return res.json({
      tables: formattedTables,
      activeOrders,
      activeCalls,
    });
  } catch (error: any) {
    console.error('Erro no dashboard do chefe:', error);
    return res.status(500).json({ error: error.message || 'Erro ao carregar salão' });
  }
});

/**
 * POST /api/restaurant/calls/:id/status
 * Atualiza status de um chamado (ex: ACKNOWLEDGED, COMPLETED)
 */
router.post('/calls/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['PENDING', 'ACKNOWLEDGED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ error: 'Status de chamado inválido' });
  }

  try {
    const tenantId = getTenantId(req);
    const call = await prisma.tableCall.findFirst({
      where: { id, tenant_id: tenantId },
      include: { table: true },
    });

    if (!call) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const updated = await prisma.tableCall.update({
      where: { id },
      data: { status },
      include: { table: true },
    });

    // Emite atualização para o painel e para a sessão da mesa
    emitToTenant(tenantId, 'call:updated', updated);
    emitToSession(call.session_id, 'call:updated', updated);

    return res.json({ success: true, call: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar chamado' });
  }
});

/**
 * POST /api/restaurant/orders/:id/status
 * Atualiza status do pedido (ex: PREPARING, DELIVERED)
 */
router.post('/orders/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['PENDING', 'PREPARING', 'DELIVERED'].includes(status)) {
    return res.status(400).json({ error: 'Status de pedido inválido' });
  }

  try {
    const tenantId = getTenantId(req);
    const order = await prisma.order.findFirst({
      where: { id, tenant_id: tenantId },
      include: { table: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        table: true,
        items: {
          include: { menu_item: true },
        },
      },
    });

    emitToTenant(tenantId, 'order:updated', updated);
    emitToSession(order.session_id, 'order:updated', updated);

    return res.json({ success: true, order: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar pedido' });
  }
});

/**
 * POST /api/restaurant/sessions/:id/close
 * Encerra a sessão da mesa (libera a mesa e desconecta o cliente remoto)
 */
router.post('/sessions/:id/close', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tenantId = getTenantId(req);
    const session = await prisma.tableSession.findFirst({
      where: { id, tenant_id: tenantId },
      include: { table: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const closed = await prisma.tableSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
      },
      include: { table: true },
    });

    // Conclui todos os chamados pendentes daquela sessão
    await prisma.tableCall.updateMany({
      where: { session_id: id, status: { in: ['PENDING', 'ACKNOWLEDGED'] } },
      data: { status: 'COMPLETED' },
    });

    // Emite desconexão imediata via WebSocket
    emitToTenant(tenantId, 'session:closed', {
      sessionId: closed.id,
      tableId: closed.table_id,
      tableLabel: closed.table.label,
    });

    emitToSession(closed.id, 'session:closed', {
      message: 'Sua mesa foi encerrada com sucesso pelo caixa do restaurante. Volte sempre!',
    });

    return res.json({
      success: true,
      message: `Mesa ${closed.table.label} liberada e sessão encerrada.`,
      session: closed,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao encerrar sessão' });
  }
});

/* =========================================================================
   EDITOR DE CARDÁPIO (CRUD DE CATEGORIAS E PRODUTOS)
   ========================================================================= */

router.get('/menu', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const categories = await prisma.category.findMany({
      where: { tenant_id: tenantId },
      orderBy: { sort_order: 'asc' },
      include: {
        items: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return res.json({ categories });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar menu' });
  }
});

router.post('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { name, icon, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
    }

    const category = await prisma.category.create({
      data: {
        tenant_id: tenantId,
        name,
        icon: icon || 'Utensils',
        sort_order: sort_order ? parseInt(sort_order, 10) : 0,
      },
    });

    return res.status(201).json({ success: true, category });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao criar categoria' });
  }
});

router.put('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, icon, sort_order } = req.body;

  try {
    const tenantId = getTenantId(req);
    const updated = await prisma.category.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(sort_order != null && { sort_order: parseInt(sort_order, 10) }),
      },
    });

    return res.json({ success: true, category: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar categoria' });
  }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tenantId = getTenantId(req);
    await prisma.category.delete({
      where: { id, tenant_id: tenantId },
    });

    return res.json({ success: true, message: 'Categoria excluída com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao excluir categoria' });
  }
});

router.post('/items', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const {
      category_id,
      name,
      description,
      price_cents,
      image_url,
      is_best_seller,
      is_story_highlight,
      is_available,
    } = req.body;

    if (!name || !price_cents || !category_id) {
      return res.status(400).json({ error: 'Nome, preço e categoria são obrigatórios' });
    }

    const item = await prisma.menuItem.create({
      data: {
        tenant_id: tenantId,
        category_id,
        name,
        description: description || '',
        price_cents: parseInt(price_cents, 10),
        image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
        is_best_seller: Boolean(is_best_seller),
        is_story_highlight: Boolean(is_story_highlight),
        is_available: is_available !== undefined ? Boolean(is_available) : true,
      },
    });

    return res.status(201).json({ success: true, item });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao criar item' });
  }
});

router.put('/items/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = getTenantId(req);
  const {
    category_id,
    name,
    description,
    price_cents,
    image_url,
    is_best_seller,
    is_story_highlight,
    is_available,
  } = req.body;

  try {
    const updated = await prisma.menuItem.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(category_id && { category_id }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price_cents !== undefined && { price_cents: parseInt(price_cents, 10) }),
        ...(image_url && { image_url }),
        ...(is_best_seller !== undefined && { is_best_seller: Boolean(is_best_seller) }),
        ...(is_story_highlight !== undefined && { is_story_highlight: Boolean(is_story_highlight) }),
        ...(is_available !== undefined && { is_available: Boolean(is_available) }),
      },
    });

    return res.json({ success: true, item: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar item' });
  }
});

router.patch('/items/:id/availability', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_available } = req.body;
  const tenantId = getTenantId(req);

  try {
    const updated = await prisma.menuItem.update({
      where: { id, tenant_id: tenantId },
      data: { is_available: Boolean(is_available) },
    });

    return res.json({ success: true, item: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao alternar disponibilidade' });
  }
});

router.delete('/items/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = getTenantId(req);

  try {
    await prisma.menuItem.delete({
      where: { id, tenant_id: tenantId },
    });

    return res.json({ success: true, message: 'Item excluído com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao excluir item' });
  }
});

export default router;
