import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /api/public/menu/:tenantSlug
 * Retorna os dados do restaurante e o cardápio público completo
 */
router.get('/:tenantSlug', async (req: Request, res: Response) => {
  const { tenantSlug } = req.params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        subtitle: true,
        logo_url: true,
        cover_url: true,
        latitude: true,
        longitude: true,
        radius_meters: true,
        active: true,
      },
    });

    if (!tenant || !tenant.active) {
      return res.status(404).json({ error: 'Restaurante não encontrado ou inativo' });
    }

    const categories = await prisma.category.findMany({
      where: { tenant_id: tenant.id },
      orderBy: { sort_order: 'asc' },
      include: {
        items: {
          orderBy: [{ is_best_seller: 'desc' }, { created_at: 'asc' }],
        },
      },
    });

    // Itens destacados para stories
    const storyHighlights = await prisma.menuItem.findMany({
      where: {
        tenant_id: tenant.id,
        is_story_highlight: true,
        is_available: true,
      },
      include: {
        category: true,
      },
      orderBy: { created_at: 'asc' },
    });

    return res.json({
      tenant,
      categories,
      storyHighlights,
    });
  } catch (error) {
    console.error('Erro ao buscar cardápio público:', error);
    return res.status(500).json({ error: 'Erro ao carregar cardápio' });
  }
});

export default router;
