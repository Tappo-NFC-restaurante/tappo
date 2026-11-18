import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Tenant, Table } from '../../types';
import TappoLogo from '../common/TappoLogo';
import { LogOut, QrCode, Plus, X } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { token, logout } = useAuth();

  const [activeNav, setActiveNav] = useState<'restaurantes' | 'tags' | 'equipe'>('restaurantes');
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedQrTable, setSelectedQrTable] = useState<Table | null>(null);
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [newTableLabel, setNewTableLabel] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const fetchTenants = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/tenants', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
        if (data.tenants && data.tenants.length > 0 && !selectedTenant) {
          setSelectedTenant(data.tenants[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar restaurantes:', err);
    }
  }, [token]);

  const fetchTables = useCallback(async (tenantId: string) => {
    if (!token || !tenantId) return;
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/tables`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (err) {
      console.error('Erro ao buscar mesas:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    if (selectedTenant?.id) {
      fetchTables(selectedTenant.id);
    }
  }, [selectedTenant?.id, fetchTables]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableLabel || !selectedTenant?.id) return;

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/tables`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ label: newTableLabel }),
      });
      if (res.ok) {
        setNewTableLabel('');
        setIsNewTableModalOpen(false);
        fetchTables(selectedTenant.id);
      }
    } catch (err) {
      console.error('Erro ao criar mesa:', err);
    }
  };

  const activeCount = tenants.filter((t) => t.active).length;

  return (
    <div className="min-h-screen bg-[#141212] text-white flex flex-col md:flex-row font-sans">
      {/* =========================================================================
          SIDEBAR BRANCA SÓLIDA (Idêntica à referência da imagem 2 direita)
         ========================================================================= */}
      <aside className="w-full md:w-56 bg-white text-zinc-900 p-6 flex flex-col justify-between shrink-0 shadow-md">
        <div className="flex flex-col gap-8">
          <TappoLogo size="lg" variant="red" />

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveNav('restaurantes')}
              className={`w-full py-2.5 px-4 rounded-2xl text-sm font-bold text-left transition ${
                activeNav === 'restaurantes'
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Restaurantes
            </button>

            <button
              onClick={() => setActiveNav('tags')}
              className={`w-full py-2.5 px-4 rounded-2xl text-sm font-bold text-left transition ${
                activeNav === 'tags'
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Tags NFC
            </button>

            <button
              onClick={() => setActiveNav('equipe')}
              className={`w-full py-2.5 px-4 rounded-2xl text-sm font-bold text-left transition ${
                activeNav === 'equipe'
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Equipe técnica
            </button>
          </nav>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-zinc-200">
          <span className="text-xs font-bold text-zinc-500">Super Admin</span>
          <button
            onClick={logout}
            className="p-2 rounded-xl text-zinc-400 hover:text-tappo-red hover:bg-zinc-100 transition"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          ÁREA PRINCIPAL (Restaurantes & Detalhe de Tags NFC)
         ========================================================================= */}
      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
        {/* Header: Restaurantes + Subtítulo */}
        <div className="pb-4 border-b border-zinc-800">
          <h1 className="text-3xl font-black text-white font-display tracking-tight">
            Restaurantes
          </h1>
          <span className="text-xs text-zinc-400 font-medium">
            {activeCount} ativos · 2 em implantação · 1 suspenso
          </span>
        </div>

        {/* Layout em Duas Colunas da Imagem 2 Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Tabela de Restaurantes (7 Colunas) */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-2 px-3 border-b border-zinc-800">
              <span className="col-span-5">Restaurante</span>
              <span className="col-span-2 text-center">Mesas</span>
              <span className="col-span-3 text-center">Tags</span>
              <span className="col-span-2 text-right">Status</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {tenants.map((tenant) => {
                const isSelected = selectedTenant?.id === tenant.id;
                const totalTables = tenant._count?.tables ?? 12;

                return (
                  <div
                    key={tenant.id}
                    onClick={() => setSelectedTenant(tenant)}
                    className={`grid grid-cols-12 items-center p-3.5 rounded-2xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1F1B1B] border-l-4 border-tappo-red'
                        : 'bg-[#181414] hover:bg-[#1E1A1A] border-l-4 border-transparent'
                    }`}
                  >
                    <span className="col-span-5 text-sm font-bold text-white truncate">
                      {tenant.name}
                    </span>

                    <span className="col-span-2 text-center text-xs font-mono text-zinc-300">
                      {totalTables}
                    </span>

                    <span className="col-span-3 text-center text-xs font-mono text-zinc-400">
                      {totalTables} de {totalTables}
                    </span>

                    <div className="col-span-2 flex justify-end">
                      {tenant.active ? (
                        <span className="bg-tappo-red text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Ativo
                        </span>
                      ) : (
                        <span className="bg-white text-black font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Suspenso
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel de Detalhes da Direita: Tags NFC do Restaurante Selecionado (5 Colunas) */}
          {selectedTenant && (
            <div className="lg:col-span-5 flex flex-col justify-between min-h-[480px] p-6 rounded-3xl bg-[#181414] border border-zinc-800/80">
              <div className="flex flex-col gap-5">
                {/* Cabeçalho do Restaurante Selecionado */}
                <div>
                  <h2 className="text-xl font-black text-white">
                    {selectedTenant.name}
                  </h2>
                  <span className="text-xs text-zinc-400">
                    Mesas 1 a {tables.length} · cardápio publicado
                  </span>
                </div>

                {/* Seção Tags NFC */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Tags NFC
                    </span>
                    <button
                      onClick={() => {
                        setNewTableLabel(`Mesa ${tables.length + 1}`);
                        setIsNewTableModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-tappo-red hover:underline flex items-center gap-1"
                    >
                      <Plus size={13} /> Nova Mesa
                    </button>
                  </div>

                  {/* Lista de Tags NFC (Exatamente como imagem 2 direita) */}
                  <div className="flex flex-col gap-3">
                    {tables.slice(0, 5).map((table, idx) => {
                      const isUnread = idx === 1; // Simula alerta da Mesa 7
                      const isUnrecorded = idx === 2; // Simula Mesa 13 não gravada

                      return (
                        <div
                          key={table.id}
                          className="flex items-center justify-between py-2 border-b border-zinc-800/80 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">
                              {table.label}
                            </span>
                            <span
                              className={`text-[11px] ${
                                isUnread
                                  ? 'text-tappo-red font-semibold'
                                  : isUnrecorded
                                  ? 'text-zinc-500'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {isUnread
                                ? 'Sem leitura há 2 dias'
                                : isUnrecorded
                                ? 'Não gravada'
                                : 'Lida há 3 min · sinal forte'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isUnrecorded ? (
                              <button
                                onClick={() => setSelectedQrTable(table)}
                                className="py-1 px-3 rounded-full bg-tappo-red hover:bg-tappo-red-hover text-white text-[11px] font-bold transition active:scale-95"
                              >
                                Gravar tag
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedQrTable(table)}
                                className="py-1 px-3 rounded-full border border-zinc-600 hover:border-white text-zinc-300 hover:text-white text-[11px] font-bold transition active:scale-95"
                              >
                                Regravar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Botões de Ação na Base (Gerar QR de contingência / Suspender restaurante) */}
              <div className="flex items-center gap-3 pt-6 border-t border-zinc-800/80 mt-6">
                <button
                  onClick={() => setSelectedQrTable(tables[0] || null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/60 bg-transparent hover:bg-white/10 text-white text-xs font-bold transition active:scale-95 text-center"
                >
                  Gerar QR de contingência
                </button>

                <button
                  onClick={() => alert('Restaurante suspenso temporariamente')}
                  className="py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition active:scale-95 text-center whitespace-nowrap"
                >
                  Suspender restaurante
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal QR Code */}
        {selectedQrTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#181414] border border-zinc-700 p-6 rounded-3xl max-w-sm w-full flex flex-col items-center gap-4 text-center">
              <h3 className="text-base font-black text-white">
                {selectedTenant?.name} — {selectedQrTable.label}
              </h3>
              <div className="p-4 bg-white rounded-2xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/m/${selectedQrTable.nfc_token}`
                  )}`}
                  alt="QR Code"
                  className="w-44 h-44"
                />
              </div>

              <div className="w-full flex flex-col gap-1">
                <span className="font-mono text-xs text-tappo-red font-bold">
                  Token: {selectedQrTable.nfc_token}
                </span>
                <span className="font-mono text-[11px] text-zinc-400 truncate bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                  {typeof window !== 'undefined' ? `${window.location.origin}/m/${selectedQrTable.nfc_token}` : ''}
                </span>
              </div>

              <div className="w-full flex gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(`${window.location.origin}/m/${selectedQrTable.nfc_token}`);
                      alert('URL copiada para o gravador NFC!');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white font-bold text-xs"
                >
                  Copiar Link NFC
                </button>
                <button
                  onClick={() => setSelectedQrTable(null)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nova Mesa */}
        {isNewTableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#181414] border border-zinc-700 p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4">
              <h3 className="text-base font-black text-white">Provisionar Nova Mesa</h3>
              <form onSubmit={handleCreateTable} className="flex flex-col gap-4">
                <input
                  type="text"
                  required
                  placeholder="Ex: Mesa 13"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewTableModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-tappo-red text-white text-xs font-bold"
                  >
                    Gerar Tag
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
