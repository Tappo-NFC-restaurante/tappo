import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Table, Order, TableCall, Category } from '../../types';
import TappoLogo from '../common/TappoLogo';
import MenuEditor from './MenuEditor';
import soundAlert from '../../utils/audioAlert';
import { formatTimeAgo, formatCurrency } from '../../utils/formatters';
import {
  LogOut,
  Volume2,
  VolumeX,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  PowerOff,
  Radio,
} from 'lucide-react';

export const ChefDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const { socket } = useSocket();

  const [activeNav, setActiveNav] = useState<'salao' | 'tags' | 'cardapio' | 'resultados'>('salao');
  const [isMuted, setIsMuted] = useState<boolean>(soundAlert.getMuted());

  // Dados do Salão
  const [tables, setTables] = useState<Table[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeCalls, setActiveCalls] = useState<TableCall[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Detalhe e QR Code da Mesa
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const tenantId = user?.tenantId;

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/restaurant/dashboard', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        setActiveOrders(data.activeOrders || []);
        setActiveCalls(data.activeCalls || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchMenuData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/restaurant/menu', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Erro ao buscar menu:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
    fetchMenuData();
  }, [fetchDashboardData, fetchMenuData]);

  useEffect(() => {
    if (!socket || !tenantId) return;
    socket.emit('join:tenant', tenantId);

    socket.on('session:active', () => fetchDashboardData());
    socket.on('order:created', (data: { order: Order }) => {
      soundAlert.playOrderChime();
      fetchDashboardData();
    });
    socket.on('order:updated', () => fetchDashboardData());
    socket.on('call:created', (data: { call: TableCall }) => {
      if (data.call.type === 'BILL') soundAlert.playBillChime();
      else soundAlert.playWaiterChime();
      fetchDashboardData();
    });
    socket.on('call:updated', () => fetchDashboardData());
    socket.on('session:closed', () => fetchDashboardData());

    return () => {
      socket.off('session:active');
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('call:created');
      socket.off('call:updated');
      socket.off('session:closed');
    };
  }, [socket, tenantId, fetchDashboardData]);

  const handleCompleteCall = async (callId: string) => {
    try {
      await fetch(`/api/restaurant/calls/${callId}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao concluir chamado:', err);
    }
  };

  const handleSendOrderToKitchen = async (orderId: string) => {
    try {
      await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status: 'PREPARING' }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao enviar pedido à cozinha:', err);
    }
  };

  const handleCloseSession = async (sessionId: string, tableLabel: string) => {
    if (!confirm(`Deseja encerrar e liberar a ${tableLabel}?`)) return;
    try {
      await fetch(`/api/restaurant/sessions/${sessionId}/close`, {
        method: 'POST',
        headers: authHeaders,
      });
      setSelectedTable(null);
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao fechar sessão:', err);
    }
  };

  const handleCopyNfcUrl = (tokenStr: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/m/${tokenStr}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(tokenStr);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundAlert.setMuted(next);
  };

  const occupiedCount = tables.filter((t) => t.hasActiveSession).length;
  const freeCount = tables.length - occupiedCount;
  const callsCount = activeCalls.length;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen bg-[#141212] text-white flex flex-col md:flex-row font-sans">
      {/* =========================================================================
          SIDEBAR BRANCA SÓLIDA (Idêntica à referência da imagem 2)
         ========================================================================= */}
      <aside className="w-full md:w-56 bg-white text-zinc-900 p-6 flex flex-col justify-between shrink-0 shadow-md">
        <div className="flex flex-col gap-8">
          <TappoLogo size="lg" variant="red" />

          {/* Abas de Navegação */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveNav('salao')}
              className={`w-full py-2.5 px-4 rounded-2xl text-sm font-bold text-left transition ${
                activeNav === 'salao'
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Salão
            </button>

            {/* Nova Aba Dedicada: Tags NFC & QR Codes */}
            <button
              onClick={() => setActiveNav('tags')}
              className={`w-full py-2.5 px-4 rounded-2xl text-sm font-bold text-left transition flex items-center justify-between ${
                activeNav === 'tags'
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <span>Tags NFC & QR</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800">
                {tables.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveNav('cardapio');
                fetchMenuData();
              }}
              className={`w-full py-2.5 px-4 rounded-2xl text-sm font-bold text-left transition ${
                activeNav === 'cardapio'
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Cardápio
            </button>

            <button
              onClick={() => setActiveNav('resultados')}
              className={`w-full py-2.5 px-4 rounded-2xl text-sm font-bold text-left transition ${
                activeNav === 'resultados'
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Resultados
            </button>
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-200">
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl transition ${
              isMuted ? 'text-zinc-400 bg-zinc-100' : 'text-tappo-red bg-rose-50'
            }`}
            title={isMuted ? 'Ativar avisos sonoros' : 'Silenciar'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-zinc-400 hover:text-tappo-red hover:bg-zinc-100 transition"
            title="Sair do painel"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          ÁREA PRINCIPAL ESCURA
         ========================================================================= */}
      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
        {/* ABA 1: SALÃO AGORA */}
        {activeNav === 'salao' && (
          <>
            {/* Header: Título Salão agora + Contadores Livres / Ocupadas / Chamados */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h1 className="text-3xl font-black text-white font-display tracking-tight">
                  Salão agora
                </h1>
                <span className="text-xs text-zinc-400 font-medium">
                  {user?.tenant?.name || 'Trattoria Ribeiro'} · almoço
                </span>
              </div>

              {/* Contadores da Imagem 2 */}
              <div className="flex items-baseline gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Livres</span>
                  <span className="text-2xl font-black text-white">{freeCount}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Ocupadas</span>
                  <span className="text-2xl font-black text-tappo-red">{occupiedCount}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Chamados</span>
                  <span className="text-2xl font-black text-white">{callsCount}</span>
                </div>

                <button
                  onClick={fetchDashboardData}
                  className="p-2 text-zinc-500 hover:text-white"
                  title="Atualizar salão"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Layout em Duas Colunas: Grid de Mesas (Esquerda) e Pedidos/Chamados (Direita) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Grid de Mesas (7 Colunas) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Mesas do Salão (Clique para ver QR Code / Gerenciar)
                  </span>
                  <button
                    onClick={() => setActiveNav('tags')}
                    className="text-xs font-bold text-tappo-red hover:underline flex items-center gap-1"
                  >
                    <QrCode size={13} />
                    <span>Ver todas as Tags NFC</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {tables.map((table) => {
                    const isOccupied = table.hasActiveSession && table.activeSession;
                    const hasBill = table.activeSession?.hasBillRequest;

                    // Estado 1: Pede a conta -> Cartão Amarelo Sólido
                    if (hasBill) {
                      return (
                        <div
                          key={table.id}
                          onClick={() => setSelectedTable(table)}
                          className="cursor-pointer bg-tappo-yellow text-black p-4 rounded-2xl flex flex-col justify-between min-h-[95px] shadow-solid-yellow active:scale-95 transition group relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-black tracking-tight">
                              {table.label}
                            </span>
                            <QrCode size={16} className="text-black/60 group-hover:text-black" />
                          </div>
                          <span className="text-xs font-bold">Pede a conta</span>
                        </div>
                      );
                    }

                    // Estado 2: Ocupada -> Cartão Vermelho Sólido
                    if (isOccupied) {
                      return (
                        <div
                          key={table.id}
                          onClick={() => setSelectedTable(table)}
                          className="cursor-pointer bg-tappo-red text-white p-4 rounded-2xl flex flex-col justify-between min-h-[95px] shadow-solid-red active:scale-95 transition group relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-black tracking-tight">
                              {table.label}
                            </span>
                            <QrCode size={16} className="text-white/70 group-hover:text-white" />
                          </div>
                          <span className="text-xs text-white/90 font-medium">
                            Ocupada · {formatTimeAgo(table.activeSession!.opened_at)}
                          </span>
                        </div>
                      );
                    }

                    // Estado 3: Livre -> Cartão Escuro com Borda Tracejada
                    return (
                      <div
                        key={table.id}
                        onClick={() => setSelectedTable(table)}
                        className="cursor-pointer border-2 border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 p-4 rounded-2xl flex flex-col justify-between min-h-[95px] transition group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-zinc-400 group-hover:text-white">
                            {table.label}
                          </span>
                          <QrCode size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                        </div>
                        <span className="text-xs text-zinc-600">Livre</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna Direita: Pedidos e chamados (5 Colunas) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Pedidos e chamados
                </h2>

                {activeCalls.length === 0 && activeOrders.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-500">
                    Nenhum pedido ou chamado pendente no momento.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Chamados de Garçom e Conta */}
                    {activeCalls.map((call) => {
                      const isBill = call.type === 'BILL';
                      return (
                        <div
                          key={call.id}
                          className="p-4 rounded-2xl bg-[#1C1818] border border-zinc-800 flex flex-col gap-2"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-black text-tappo-red">
                              {call.table?.label} · {isBill ? 'Pedir a conta' : 'Chamando garçom'}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {formatTimeAgo(call.created_at)}
                            </span>
                          </div>

                          <span className="text-xs text-zinc-300">
                            {isBill
                              ? `${call.payment_method || 'PIX'} · ${formatCurrency(
                                  call.estimated_total_cents || 0
                                )}`
                              : `Motivo: ${call.reason || 'atendimento geral'}`}
                          </span>

                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleCompleteCall(call.id)}
                              className="py-1.5 px-4 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold transition active:scale-95 shadow-sm"
                            >
                              {isBill ? 'Levar a conta' : 'Marcar atendido'}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pedidos da Cozinha */}
                    {activeOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-[#1C1818] border border-zinc-800 flex flex-col gap-2"
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-black text-white">
                            {order.table?.label} · Novo pedido
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {formatTimeAgo(order.created_at)}
                          </span>
                        </div>

                        <span className="text-xs text-zinc-300">
                          {order.items
                            .map((oi) => `${oi.menu_item?.name} x${oi.quantity}`)
                            .join(' · ')}
                        </span>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleSendOrderToKitchen(order.id)}
                            className="py-1.5 px-4 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold transition active:scale-95 shadow-sm"
                          >
                            Enviar à cozinha
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ABA 2: TAGS NFC & QR CODES (Pronto para copiar e gravar nas tags físicas) */}
        {activeNav === 'tags' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h1 className="text-3xl font-black text-white font-display tracking-tight">
                  Tags NFC & QR Codes do Salão
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Copie o link direto de cada mesa para gravar no chip NFC físico (NFC Tools) ou utilize os QR Codes de mesa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400">
                  Host Atual: <strong className="text-white">{origin}</strong>
                </span>
              </div>
            </div>

            {/* Grid de Mesas com Links e QR Codes Prontos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table) => {
                const nfcUrl = `${origin}/m/${table.nfc_token}`;
                const isCopied = copiedToken === table.nfc_token;

                return (
                  <div
                    key={table.id}
                    className="p-5 rounded-2xl bg-[#1C1818] border border-zinc-800 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-rose-500/10 text-tappo-red">
                          <Radio size={18} />
                        </span>
                        <div>
                          <h3 className="text-base font-black text-white">{table.label}</h3>
                          <span className="text-[11px] font-mono text-zinc-400">
                            Token: <strong className="text-tappo-red">{table.nfc_token}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedTable(table)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                        title="Ampliar QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                    </div>

                    {/* URL Pronta para Gravação NFC */}
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-zinc-300 truncate">
                        {nfcUrl}
                      </span>

                      <button
                        onClick={() => handleCopyNfcUrl(table.nfc_token)}
                        className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white shrink-0 active:scale-95 transition text-[11px] font-bold flex items-center gap-1"
                        title="Copiar URL para o gravador NFC"
                      >
                        {isCopied ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check size={12} /> Copiado!
                          </span>
                        ) : (
                          <>
                            <Copy size={12} /> Copiar
                          </>
                        )}
                      </button>
                    </div>

                    {/* Botões de Ação Rápida */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedTable(table)}
                        className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                      >
                        <QrCode size={14} />
                        <span>Ver QR Code</span>
                      </button>

                      <a
                        href={`/m/${table.nfc_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
                        title="Simular leitura NFC no navegador"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 3: CARDÁPIO */}
        {activeNav === 'cardapio' && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-black text-white font-display">
              Editor de Cardápio
            </h1>
            <MenuEditor
              categories={categories}
              token={token}
              onRefresh={fetchMenuData}
            />
          </div>
        )}

        {/* ABA 4: RESULTADOS */}
        {activeNav === 'resultados' && (
          <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-zinc-400">
            <h2 className="text-lg font-bold text-white mb-2">Relatórios do Restaurante</h2>
            <p className="text-xs">
              Módulo de análise de faturamento diário, tempo médio de atendimento e pratos mais vendidos.
            </p>
          </div>
        )}

        {/* MODAL UNIVERSAL DE QR CODE & GRAVAÇÃO NFC DA MESA */}
        {selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="bg-[#181414] border border-zinc-700 p-6 rounded-3xl max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-tappo-red uppercase tracking-wider">
                  Tag NFC & QR Code
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Token: <strong>{selectedTable.nfc_token}</strong>
                </span>
              </div>

              <h3 className="text-xl font-black text-white font-display -mt-2">
                {selectedTable.label}
              </h3>

              {/* QR Code Container aponta dinamicamente para o Render / Host Atual */}
              <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-tappo-red">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `${origin}/m/${selectedTable.nfc_token}`
                  )}`}
                  alt={`QR Code ${selectedTable.label}`}
                  className="w-48 h-48"
                />
              </div>

              {/* Caixa com a URL exata do Render para copiar */}
              <div className="w-full flex flex-col gap-1.5 text-left">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">
                  URL para Gravar no Chip NFC:
                </span>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-white truncate">
                    {`${origin}/m/${selectedTable.nfc_token}`}
                  </span>
                  <button
                    onClick={() => handleCopyNfcUrl(selectedTable.nfc_token)}
                    className="py-1 px-3 rounded-lg bg-tappo-red hover:bg-tappo-red-hover text-white text-xs font-bold shrink-0 transition"
                  >
                    {copiedToken === selectedTable.nfc_token ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Ações da Mesa */}
              <div className="w-full flex flex-col gap-2 pt-2">
                {selectedTable.hasActiveSession && selectedTable.activeSession && (
                  <button
                    onClick={() =>
                      handleCloseSession(selectedTable.activeSession!.id, selectedTable.label)
                    }
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-400 border border-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 transition text-zinc-300"
                  >
                    <PowerOff size={14} />
                    <span>Liberar / Encerrar Sessão desta Mesa</span>
                  </button>
                )}

                <div className="flex gap-2">
                  <a
                    href={`/m/${selectedTable.nfc_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink size={14} />
                    <span>Testar no Navegador</span>
                  </a>

                  <button
                    onClick={() => setSelectedTable(null)}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black transition"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChefDashboard;
