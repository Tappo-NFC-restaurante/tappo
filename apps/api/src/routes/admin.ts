import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateJwt, requireRole } from '../middlewares/auth';
import { generateNfcToken } from '../utils/nfcToken';

const router = Router();

// Exclusivo para SUPER_ADMIN da coordenação tappo
router.use(authenticateJwt);
router.use(requireRole(['SUPER_ADMIN']));

/**
 * GET /api/admin/tenants
 * Lista todos os restaurantes cadastrados
 */
router.get('/tenants', async (_req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            tables: true,
            users: true,
            menu_items: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ tenants });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao listar restaurantes' });
  }
});

/**
 * POST /api/admin/tenants
 * Cadastra novo restaurante
 */
router.post('/tenants', async (req: Request, res: Response) => {
  const { name, slug, subtitle, logo_url, cover_url, latitude, longitude, radius_meters, active } =
    req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
  }

  try {
    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const existing = await prisma.tenant.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing) {
      return res.status(400).json({ error: 'Slug já está em uso por outro restaurante' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: normalizedSlug,
        subtitle: subtitle || null,
        logo_url: logo_url || null,
        cover_url: cover_url || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radius_meters: radius_meters ? parseInt(radius_meters, 10) : 100,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return res.status(201).json({ success: true, tenant });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao cadastrar restaurante' });
  }
});

/**
 * PUT /api/admin/tenants/:id
 * Atualiza restaurante
 */
router.put('/tenants/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, subtitle, logo_url, cover_url, latitude, longitude, radius_meters, active } =
    req.body;

  try {
    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug: slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-') }),
        ...(subtitle !== undefined && { subtitle }),
        ...(logo_url !== undefined && { logo_url }),
        ...(cover_url !== undefined && { cover_url }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(radius_meters !== undefined && { radius_meters: parseInt(radius_meters, 10) }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });

    return res.json({ success: true, tenant: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar restaurante' });
  }
});

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
 * GET /api/admin/tenants/:tenantId/tables
 * Lista todas as mesas de um restaurante com URLs e tokens para gravação NFC
 */
router.get('/tenants/:tenantId/tables', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const baseUrl = getBaseUrl(req);

  try {
    const tables = await prisma.table.findMany({
      where: { tenant_id: tenantId },
      orderBy: { label: 'asc' },
    });

    const tablesWithNfcData = tables.map((t) => ({
      ...t,
      nfc_url: `${baseUrl}/m/${t.nfc_token}`,
    }));

    return res.json({ tables: tablesWithNfcData });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao buscar mesas' });
  }
});

/**
 * POST /api/admin/tenants/:tenantId/tables
 * Provisiona nova mesa com nfc_token aleatório de 6 caracteres único
 */
router.post('/tenants/:tenantId/tables', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const { label } = req.body;
  const baseUrl = getBaseUrl(req);

  if (!label) {
    return res.status(400).json({ error: 'Identificação da mesa (ex: "Mesa 09") é obrigatória' });
  }

  try {
    // Gera token aleatório sem colisão
    let token = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      token = generateNfcToken(6);
      const existing = await prisma.table.findUnique({
        where: { nfc_token: token },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Falha ao gerar token NFC único. Tente novamente.' });
    }

    const table = await prisma.table.create({
      data: {
        tenant_id: tenantId,
        label,
        nfc_token: token,
        active: true,
      },
    });

    return res.status(201).json({
      success: true,
      table: {
        ...table,
        nfc_url: `${baseUrl}/m/${table.nfc_token}`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao provisionar mesa' });
  }
});

/**
 * PUT /api/admin/tables/:id
 * Atualiza status ou label da mesa
 */
router.put('/tables/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { label, active, regenerate_token } = req.body;

  try {
    let newToken: string | undefined = undefined;
    if (regenerate_token) {
      newToken = generateNfcToken(6);
    }

    const updated = await prisma.table.update({
      where: { id },
      data: {
        ...(label && { label }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(newToken && { nfc_token: newToken }),
      },
    });

    const baseUrl = getBaseUrl(req);
    return res.json({
      success: true,
      table: {
        ...updated,
        nfc_url: `${baseUrl}/m/${updated.nfc_token}`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar mesa' });
  }
});

/**
 * DELETE /api/admin/tables/:id
 */
router.delete('/tables/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.table.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Mesa excluída com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao excluir mesa' });
  }
});

export default router;
