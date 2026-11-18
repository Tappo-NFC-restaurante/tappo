import { PrismaClient, UserRole, SessionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SAFE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

function generateSafeToken(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_ALPHABET.length);
    result += SAFE_ALPHABET[randomIndex];
  }
  return result;
}

async function main() {
  console.log('🌱 Verificando inicialização da plataforma tappo...');

  const tenantCount = await prisma.tenant.count();
  const forceSeed = process.env.FORCE_SEED === 'true';

  if (tenantCount > 0 && !forceSeed) {
    console.log('✅ Banco de dados já possui dados semeados. Mantendo dados persistidos.');
    return;
  }

  console.log('🌱 Executando seed inicial (Padrão iFood / Trattoria Ribeiro)...');

  // Limpeza
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableCall.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 1. Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Coordenação tappo',
      email: 'admin@tappo.app',
      password_hash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });

  // 2. Restaurante Principal: Trattoria Ribeiro (Identidade visual da referência)
  const trattoria = await prisma.tenant.create({
    data: {
      name: 'Trattoria Ribeiro',
      slug: 'trattoria-ribeiro',
      subtitle: 'Cozinha de fogo lento · 25 a 40 min',
      logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
      latitude: -23.561684,
      longitude: -46.655981,
      radius_meters: 200,
      active: true,
    },
  });

  // Restaurante Secundário para lista admin: Osteria do Porto
  await prisma.tenant.create({
    data: {
      name: 'Osteria do Porto',
      slug: 'osteria-do-porto',
      subtitle: 'Frutos do mar e massas frescas',
      logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&auto=format&fit=crop&q=80',
      radius_meters: 150,
      active: true,
    },
  });

  // Restaurante Suspenso: Casa Miúda
  await prisma.tenant.create({
    data: {
      name: 'Casa Miúda',
      slug: 'casa-miuda',
      subtitle: 'Tapas e vinhos naturais',
      radius_meters: 100,
      active: false,
    },
  });

  // Restaurante Alias (Smash & Co.)
  const smashCo = await prisma.tenant.create({
    data: {
      name: 'Smash & Co.',
      slug: 'smash-co',
      subtitle: 'Burgers Artesanais & Tex-Mex',
      logo_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80',
      latitude: -23.561684,
      longitude: -46.655981,
      radius_meters: 200,
      active: true,
    },
  });

  // 3. Usuário Chefe Trattoria Ribeiro
  const ownerPassword = await bcrypt.hash('chefe123', 10);
  await prisma.user.create({
    data: {
      tenant_id: trattoria.id,
      name: 'Chefe Ribeiro',
      email: 'chefe@smashco.com', // Mantém credencial padrão para conveniência
      password_hash: ownerPassword,
      role: UserRole.RESTAURANT_OWNER,
    },
  });

  // 4. Criar as 12 Mesas da Trattoria Ribeiro (exatamente como no painel de referência)
  // Mesa 12 tem token 'k9x4m2', Mesa 3 tem 'm3x7w8', Mesa 7 tem 'm7y4k9'
  const presetTokens: Record<number, string> = {
    1: 'm1a2b3',
    3: 'm3x7w8',
    4: 'm4c5d6',
    5: 'm5e6f7',
    7: 'm7y4k9',
    8: 'm8w3v7',
    9: 'm9h8j7',
    12: 'k9x4m2',
  };

  const tables = [];
  for (let i = 1; i <= 12; i++) {
    const label = `Mesa ${i}`;
    const token = presetTokens[i] || generateSafeToken(6);
    const table = await prisma.table.create({
      data: {
        tenant_id: trattoria.id,
        label,
        nfc_token: token,
        active: true,
      },
    });
    tables.push(table);
  }

  // 5. Categorias da Trattoria Ribeiro (Entradas, Principais, Massas, Sobremesas, Bebidas)
  const catEntradas = await prisma.category.create({
    data: { tenant_id: trattoria.id, name: 'Entradas', icon: 'Utensils', sort_order: 1 },
  });
  const catPrincipais = await prisma.category.create({
    data: { tenant_id: trattoria.id, name: 'Principais', icon: 'Flame', sort_order: 2 },
  });
  const catMassas = await prisma.category.create({
    data: { tenant_id: trattoria.id, name: 'Massas', icon: 'Layers', sort_order: 3 },
  });
  const catSobremesas = await prisma.category.create({
    data: { tenant_id: trattoria.id, name: 'Sobremesas', icon: 'Cake', sort_order: 4 },
  });

  // 6. Pratos (Exatamente como nas imagens de referência)
  const itemCarpaccio = await prisma.menuItem.create({
    data: {
      tenant_id: trattoria.id,
      category_id: catEntradas.id,
      name: 'Carpaccio de wagyu',
      description: 'Alcaparras, parmesão e limão siciliano. Fatiado na hora, servido gelado.',
      price_cents: 6800, // R$ 68
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      is_best_seller: true,
      is_story_highlight: true,
      is_available: true,
    },
  });

  const itemBurrata = await prisma.menuItem.create({
    data: {
      tenant_id: trattoria.id,
      category_id: catEntradas.id,
      name: 'Burrata com tomate assado',
      description: 'Manjericão fresco, azeite extravirgem e pão de fermentação longa artesanal.',
      price_cents: 5200, // R$ 52
      image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=800&auto=format&fit=crop&q=80',
      is_best_seller: false,
      is_story_highlight: true,
      is_available: true,
    },
  });

  const itemRisoto = await prisma.menuItem.create({
    data: {
      tenant_id: trattoria.id,
      category_id: catPrincipais.id,
      name: 'Risoto de cogumelos e trufas',
      description: 'Arroz arbóreo mantecato com mix de cogumelos frescos, manteiga trufada e grana padano.',
      price_cents: 8400, // R$ 84
      image_url: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800&auto=format&fit=crop&q=80',
      is_best_seller: true,
      is_story_highlight: true,
      is_available: true,
    },
  });

  const itemTagliolini = await prisma.menuItem.create({
    data: {
      tenant_id: trattoria.id,
      category_id: catMassas.id,
      name: 'Tagliolini al tartufo fresco',
      description: 'Massa fresca feita na casa, emulsão de manteiga da montanha e lascas de trufa negra.',
      price_cents: 9200, // R$ 92
      image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
      is_best_seller: false,
      is_story_highlight: false,
      is_available: true,
    },
  });

  const itemTiramisu = await prisma.menuItem.create({
    data: {
      tenant_id: trattoria.id,
      category_id: catSobremesas.id,
      name: 'Tiramisù clássico veneziano',
      description: 'Biscoitos savoiardi embebidos em café espresso com mascarpone fresco e cacau 100%.',
      price_cents: 3600, // R$ 36
      image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=80',
      is_best_seller: true,
      is_story_highlight: false,
      is_available: true,
    },
  });

  // 7. Simular o estado real do Salão (da imagem 2):
  // Mesas ocupadas: Mesa 1 (42 min), Mesa 5 (12 min), Mesa 9 (27 min), Mesa 12 (8 min)
  // Mesa 3: Pede a conta (Pix R$ 214,00)
  // Mesa 7: Chamando garçom (motivo: talheres e guardanapos)
  // Mesas livres: Mesa 4, Mesa 8, etc.

  const mesa1 = tables.find((t) => t.label === 'Mesa 1')!;
  const mesa3 = tables.find((t) => t.label === 'Mesa 3')!;
  const mesa5 = tables.find((t) => t.label === 'Mesa 5')!;
  const mesa7 = tables.find((t) => t.label === 'Mesa 7')!;
  const mesa9 = tables.find((t) => t.label === 'Mesa 9')!;
  const mesa12 = tables.find((t) => t.label === 'Mesa 12')!;

  // Mesa 1: Ocupada há 42 min
  await prisma.tableSession.create({
    data: {
      table_id: mesa1.id,
      tenant_id: trattoria.id,
      status: SessionStatus.OPEN,
      opened_at: new Date(Date.now() - 42 * 60 * 1000),
    },
  });

  // Mesa 5: Ocupada há 12 min
  await prisma.tableSession.create({
    data: {
      table_id: mesa5.id,
      tenant_id: trattoria.id,
      status: SessionStatus.OPEN,
      opened_at: new Date(Date.now() - 12 * 60 * 1000),
    },
  });

  // Mesa 9: Ocupada há 27 min
  await prisma.tableSession.create({
    data: {
      table_id: mesa9.id,
      tenant_id: trattoria.id,
      status: SessionStatus.OPEN,
      opened_at: new Date(Date.now() - 27 * 60 * 1000),
    },
  });

  // Mesa 12: Ocupada há 8 min com novo pedido enviado
  const session12 = await prisma.tableSession.create({
    data: {
      table_id: mesa12.id,
      tenant_id: trattoria.id,
      session_token: 'session-demo-mesa-12',
      status: SessionStatus.OPEN,
      opened_at: new Date(Date.now() - 8 * 60 * 1000),
    },
  });

  await prisma.order.create({
    data: {
      session_id: session12.id,
      tenant_id: trattoria.id,
      table_id: mesa12.id,
      status: 'PENDING',
      total_cents: 22000,
      location_verified: true,
      created_at: new Date(Date.now() - 60 * 1000), // há 1 min
      items: {
        create: [
          { menu_item_id: itemCarpaccio.id, quantity: 2, unit_price_cents: 6800 },
          { menu_item_id: itemRisoto.id, quantity: 1, unit_price_cents: 8400 },
        ],
      },
    },
  });

  // Mesa 3: Pede a conta (Pix · R$ 214,00) há 2 min
  const session3 = await prisma.tableSession.create({
    data: {
      table_id: mesa3.id,
      tenant_id: trattoria.id,
      status: SessionStatus.OPEN,
      opened_at: new Date(Date.now() - 55 * 60 * 1000),
    },
  });

  await prisma.tableCall.create({
    data: {
      session_id: session3.id,
      tenant_id: trattoria.id,
      table_id: mesa3.id,
      type: 'BILL',
      payment_method: 'PIX',
      include_tip: true,
      estimated_total_cents: 21400,
      status: 'PENDING',
      created_at: new Date(Date.now() - 120 * 1000), // há 2 min
    },
  });

  // Mesa 7: Chamando garçom (talheres e guardanapos) há 45s
  const session7 = await prisma.tableSession.create({
    data: {
      table_id: mesa7.id,
      tenant_id: trattoria.id,
      status: SessionStatus.OPEN,
      opened_at: new Date(Date.now() - 18 * 60 * 1000),
    },
  });

  await prisma.tableCall.create({
    data: {
      session_id: session7.id,
      tenant_id: trattoria.id,
      table_id: mesa7.id,
      type: 'WAITER',
      reason: 'talheres e guardanapos',
      status: 'PENDING',
      created_at: new Date(Date.now() - 45 * 1000), // há 45s
    },
  });

  console.log('\n🚀 SEED TRATTORIA RIBEIRO (PADRÃO iFOOD) CONCLUÍDO!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
