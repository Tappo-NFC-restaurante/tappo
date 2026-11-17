import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Bell, AlertCircle, Check } from 'lucide-react';
import { Tenant, Category, MenuItem, Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useSocket } from '../../context/SocketContext';
import StoriesViewer from './StoriesViewer';
import CallWaiterDrawer from './CallWaiterDrawer';
import BillDrawer, { ConsumedItem } from './BillDrawer';

export const CustomerMenu: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams] = useSearchParams();
  const sessionTokenFromUrl = searchParams.get('st');

  const { socket } = useSocket();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storyHighlights, setStoryHighlights] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tableLabel, setTableLabel] = useState<string>('Mesa 12');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Modais e gavetas
  const [isStoriesOpen, setIsStoriesOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isWaiterDrawerOpen, setIsWaiterDrawerOpen] = useState(false);
  const [isBillDrawerOpen, setIsBillDrawerOpen] = useState(false);

  // Consumo local da mesa
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [serverOrders, setServerOrders] = useState<Order[]>([]);
  const [sessionClosedAlert, setSessionClosedAlert] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMenuAndSession() {
      setIsLoading(true);
      try {
        const slug = tenantSlug || 'trattoria-ribeiro';
        const menuRes = await fetch(`/api/public/menu/${slug}`);
        if (!menuRes.ok) {
          // Fallback para trattoria-ribeiro se não achar
          const fallbackRes = await fetch('/api/public/menu/trattoria-ribeiro');
          if (!fallbackRes.ok) throw new Error('Restaurante indisponível');
          const data = await fallbackRes.json();
          setTenant(data.tenant);
          setCategories(data.categories);
          setStoryHighlights(data.storyHighlights || []);
        } else {
          const data = await menuRes.json();
          setTenant(data.tenant);
          setCategories(data.categories);
          setStoryHighlights(data.storyHighlights || []);
        }

        const sessionHeaders: HeadersInit = {};
        if (sessionTokenFromUrl) {
          sessionHeaders['x-session-token'] = sessionTokenFromUrl;
        }

        const sessionRes = await fetch('/api/session/current', { headers: sessionHeaders });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setTableLabel(sessionData.table.label);
          setSessionId(sessionData.session.id);
          setServerOrders(sessionData.orders || []);
        } else {
          setTableLabel('Mesa 12');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao carregar cardápio');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMenuAndSession();
  }, [tenantSlug, sessionTokenFromUrl]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    socket.emit('join:session', sessionId);

    socket.on('session:closed', (data: { message?: string }) => {
      setSessionClosedAlert(
        data.message || 'Sua conta foi finalizada com sucesso pelo restaurante. Volte sempre!'
      );
    });

    return () => {
      socket.emit('leave:session', sessionId);
      socket.off('session:closed');
    };
  }, [socket, sessionId]);

  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    setCartItems((prev) => {
      const copy = { ...prev };
      if (newQuantity <= 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = newQuantity;
      }
      return copy;
    });
  };

  const allMenuItems: MenuItem[] = categories.flatMap((c) => c.items);
  const menuMap = new Map(allMenuItems.map((i) => [i.id, i]));
  const consumedItems: ConsumedItem[] = [];

  serverOrders.forEach((order) => {
    order.items.forEach((oi) => {
      const existing = consumedItems.find((ci) => ci.id === oi.menu_item_id);
      if (existing) {
        existing.quantity += oi.quantity;
      } else {
        consumedItems.push({
          id: oi.menu_item_id,
          name: oi.menu_item.name,
          unitPriceCents: oi.unit_price_cents,
          quantity: oi.quantity,
        });
      }
    });
  });

  Object.entries(cartItems).forEach(([itemId, qty]) => {
    const item = menuMap.get(itemId);
    if (!item) return;
    const existing = consumedItems.find((ci) => ci.id === itemId);
    if (existing) {
      existing.quantity += qty;
    } else {
      consumedItems.push({
        id: itemId,
        name: item.name,
        unitPriceCents: item.price_cents,
        quantity: qty,
      });
    }
  });

  const totalCartCount = consumedItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleConfirmCallWaiter = async (reason?: string) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (sessionTokenFromUrl) headers['x-session-token'] = sessionTokenFromUrl;

    const res = await fetch('/api/session/calls', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'WAITER', reason }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, remainingSeconds: data.remainingSeconds, error: data.error };
    }
    return { success: true };
  };

  const handleConfirmBill = async (data: {
    paymentMethod: 'CREDIT' | 'DEBIT' | 'PIX' | 'CASH';
    includeTip: boolean;
    estimatedTotalCents: number;
    clientCoords?: { latitude: number; longitude: number } | null;
  }) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (sessionTokenFromUrl) headers['x-session-token'] = sessionTokenFromUrl;

    const res = await fetch('/api/session/calls', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'BILL',
        paymentMethod: data.paymentMethod,
        includeTip: data.includeTip,
        estimatedTotalCents: data.estimatedTotalCents,
        clientCoords: data.clientCoords,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Erro ao pedir conta');
    }
    return { success: true, message: resData.message };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tappo-dark flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-tappo-red border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-zinc-400">Abrindo cardápio...</span>
      </div>
    );
  }

  if (errorMessage && !tenant) {
    return (
      <div className="min-h-screen bg-tappo-dark flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={44} className="text-tappo-red mb-3" />
        <h2 className="text-lg font-black text-white">Cardápio Indisponível</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">{errorMessage}</p>
      </div>
    );
  }

  const displayedCategories =
    selectedCategory === 'all'
      ? categories
      : categories.filter((c) => c.name === selectedCategory);

  // Lista de Stories para o carrossel circular
  const storyList = storyHighlights.length > 0 ? storyHighlights : allMenuItems.slice(0, 4);

  // Cores dos aros dos círculos de stories (amarelo, dourado, vermelho)
  const ringColors = [
    'border-[#FFC700]', // Amarelo
    'border-[#D97706]', // Dourado escuro
    'border-tappo-red',  // Vermelho
    'border-amber-500',
  ];

  return (
    <div className="min-h-screen bg-tappo-dark text-white pb-32 font-sans selection:bg-tappo-red selection:text-white">
      <div className="max-w-md mx-auto relative flex flex-col">
        {/* =========================================================================
            1. HEADER VERMELHO SÓLIDO (Exatamente como a referência da imagem 1)
           ========================================================================= */}
        <header className="bg-tappo-red px-5 pt-6 pb-7 rounded-b-[32px] shadow-lg flex flex-col gap-3">
          {/* Linha superior: Mesa e Logo tappo em branco */}
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm tracking-wide">
              {tableLabel}
            </span>
            <span className="text-white font-black text-lg tracking-tight lowercase">
              tappo
            </span>
          </div>

          {/* Nome Grande do Restaurante e Subtítulo */}
          <div className="flex flex-col mt-1">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none font-display">
              {tenant?.name || 'Trattoria Ribeiro'}
            </h1>
            <span className="text-white/80 text-xs font-normal mt-1.5">
              {tenant?.subtitle || 'Cozinha de fogo lento · 25 a 40 min'}
            </span>
          </div>
        </header>

        {/* =========================================================================
            2. DESTAQUES DA CASA (STORIES CIRCULARES)
           ========================================================================= */}
        <section className="px-5 pt-6 pb-2 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Destaques da casa
          </h2>

          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
            {storyList.map((item, idx) => {
              const ringColor = ringColors[idx % ringColors.length];
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveStoryIndex(idx);
                    setIsStoriesOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition"
                >
                  {/* Círculo do Story com aro colorido e foto dentro */}
                  <div className={`w-[72px] h-[72px] rounded-full border-2 ${ringColor} p-[2.5px] bg-tappo-dark`}>
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full rounded-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  {/* Label curto embaixo */}
                  <span className="text-xs font-medium text-white/90 truncate max-w-[72px]">
                    {item.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            3. FILTRO DE CATEGORIAS (PÍLULAS SÓLIDAS)
           ========================================================================= */}
        <div className="sticky top-0 z-30 bg-tappo-dark/95 backdrop-blur-md px-5 py-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Pílula Todas */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                selectedCategory === 'all'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-[#221F1F] text-white/90 hover:bg-zinc-800'
              }`}
            >
              Cardápio
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                    isSelected
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-[#221F1F] text-white/90 hover:bg-zinc-800'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            4. LISTA DE PRATOS (LAYOUT LIMPO COM PREÇO EM VERMELHO E BADGE AMARELA)
           ========================================================================= */}
        <main className="px-5 pt-4 flex flex-col gap-6">
          {displayedCategories.map((category) => (
            <section key={category.id} className="flex flex-col gap-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                {category.name}
              </h3>

              <div className="flex flex-col gap-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="cursor-pointer bg-[#1C1818] hover:bg-[#231E1E] border border-zinc-800/80 rounded-2xl p-3 flex gap-3.5 items-center transition active:scale-[0.99]"
                  >
                    {/* Foto quadrada do prato na esquerda */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Conteúdo central e direito */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                          {item.name}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Linha inferior: Preço em vermelho e Badge Mais Pedido em Amarelo */}
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-sm font-black text-tappo-red">
                          {formatCurrency(item.price_cents)}
                        </span>

                        {item.is_best_seller && (
                          <span className="bg-tappo-yellow text-black font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            Mais pedido
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>

        {/* =========================================================================
            5. BARRA INFERIOR BRANCA SÓLIDA COM BOTÃO VERMELHO 'PEDIR A CONTA'
           ========================================================================= */}
        <footer className="fixed bottom-0 inset-x-0 z-40 bg-white rounded-t-3xl shadow-2xl p-4 px-6 border-t border-zinc-200">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            {/* Chamar Garçom */}
            <button
              onClick={() => setIsWaiterDrawerOpen(true)}
              className="flex items-center gap-2 py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition active:scale-95"
            >
              <Bell size={16} className="text-tappo-red" />
              <span>Chamar Garçom</span>
            </button>

            {/* Pedir a Conta (Botão Vermelho iFood) */}
            <button
              onClick={() => setIsBillDrawerOpen(true)}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-tappo-red hover:bg-tappo-red-hover text-white text-sm font-black text-center shadow-solid-red transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Pedir a conta</span>
              {totalCartCount > 0 && (
                <span className="bg-white text-tappo-red px-2 py-0.5 rounded-full text-[11px] font-black">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </footer>

        {/* Stories em Tela Cheia */}
        <StoriesViewer
          isOpen={isStoriesOpen}
          stories={storyList}
          tableLabel={tableLabel}
          onClose={() => setIsStoriesOpen(false)}
          onAddToCart={handleAddToCart}
        />

        {/* Gaveta Chamar Garçom */}
        <CallWaiterDrawer
          isOpen={isWaiterDrawerOpen}
          tableLabel={tableLabel}
          onClose={() => setIsWaiterDrawerOpen(false)}
          onConfirmCall={handleConfirmCallWaiter}
        />

        {/* Gaveta Fechar Conta */}
        <BillDrawer
          isOpen={isBillDrawerOpen}
          tableLabel={tableLabel}
          items={consumedItems}
          onClose={() => setIsBillDrawerOpen(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onConfirmBill={handleConfirmBill}
        />

        {/* Alerta de Mesa Fechada */}
        {sessionClosedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-tappo-surface border border-zinc-700 p-6 rounded-3xl max-w-sm text-center shadow-2xl flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Check size={28} />
              </div>
              <h3 className="text-lg font-black text-white">Mesa Encerrada</h3>
              <p className="text-xs text-zinc-300 mt-1">{sessionClosedAlert}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 w-full py-3 rounded-xl bg-tappo-red text-white text-xs font-bold"
              >
                Nova Mesa NFC
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerMenu;
