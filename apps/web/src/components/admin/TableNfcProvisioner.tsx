import React, { useState, useEffect } from 'react';
import { Tenant, Table } from '../../types';
import {
  Radio,
  Plus,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ChevronLeft,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface TableNfcProvisionerProps {
  tenant: Tenant;
  token: string | null;
  onBack: () => void;
}

export const TableNfcProvisioner: React.FC<TableNfcProvisionerProps> = ({
  tenant,
  token,
  onBack,
}) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedQrTable, setSelectedQrTable] = useState<Table | null>(null);

  // Modal nova mesa
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [newTableLabel, setNewTableLabel] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/tables`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (err) {
      console.error('Erro ao buscar mesas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [tenant.id]);

  const handleCopyUrl = (nfcUrl: string, tokenStr: string) => {
    navigator.clipboard.writeText(nfcUrl);
    setCopiedToken(tokenStr);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableLabel) return;

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/tables`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ label: newTableLabel }),
      });
      if (res.ok) {
        setNewTableLabel('');
        setIsNewTableModalOpen(false);
        fetchTables();
      }
    } catch (err) {
      console.error('Erro ao provisionar mesa:', err);
    }
  };

  const handleDeleteTable = async (id: string, label: string) => {
    if (!confirm(`Deseja remover a mesa "${label}"?`)) return;

    try {
      await fetch(`/api/admin/tables/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      fetchTables();
    } catch (err) {
      console.error('Erro ao excluir mesa:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header com Botão Voltar */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-95"
            title="Voltar para lista de restaurantes"
          >
            <ChevronLeft size={18} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white font-display">
                Provisionamento NFC: {tenant.name}
              </h2>
              <span className="text-xs font-mono text-tappo-secondary">
                ({tables.length} mesas)
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Grave as URLs nos chips NTAG213/215 físicos ou utilize o QR Code para contingência
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const nextIndex = tables.length + 1;
            setNewTableLabel(`Mesa ${String(nextIndex).padStart(2, '0')}`);
            setIsNewTableModalOpen(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition shadow-solid-red shrink-0"
        >
          <Plus size={16} />
          <span>Provisionar Mesa</span>
        </button>
      </div>

      {/* Lista de Mesas Provisionadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tables.map((table) => {
          const nfcUrl = table.nfc_url || `http://localhost:3001/m/${table.nfc_token}`;
          const isCopied = copiedToken === table.nfc_token;

          return (
            <div
              key={table.id}
              className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-zinc-700 transition"
            >
              {/* Header do Card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-rose-500/15 text-tappo-red">
                    <Radio size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">{table.label}</h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                      <span>Token NFC:</span>
                      <strong className="text-tappo-red font-bold">
                        {table.nfc_token}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTable(table.id, table.label)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                  title="Excluir mesa"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* URL Física para Gravação no Chip NFC */}
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-zinc-300 truncate">
                  {nfcUrl}
                </span>

                <button
                  onClick={() => handleCopyUrl(nfcUrl, table.nfc_token)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white shrink-0 active:scale-90 transition"
                  title="Copiar URL para gravador NFC"
                >
                  {isCopied ? (
                    <span className="text-emerald-400 flex items-center text-[10px] font-bold gap-1 px-1">
                      <Check size={12} /> Copiado!
                    </span>
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>

              {/* Ações: Ver QR Code Contingência & Simular Toque */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setSelectedQrTable(table)}
                  className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <QrCode size={14} />
                  <span>QR Code</span>
                </button>

                <a
                  href={`/m/${table.nfc_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <ExternalLink size={14} />
                  <span>Simular Toque NFC</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal QR Code de Contingência */}
      {selectedQrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-tappo-surface border border-zinc-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
            <h3 className="text-base font-black text-white font-display">
              {tenant.name} — {selectedQrTable.label}
            </h3>
            <span className="text-xs text-zinc-400 -mt-2">
              QR Code de Contingência para Totem / Mesa
            </span>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-tappo-red">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  selectedQrTable.nfc_url || `http://localhost:3001/m/${selectedQrTable.nfc_token}`
                )}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>

            <div className="flex flex-col items-center">
              <span className="font-mono font-bold text-sm text-tappo-secondary">
                Token: {selectedQrTable.nfc_token}
              </span>
              <span className="text-[11px] text-zinc-500 max-w-xs mt-1">
                Aponte a câmera do celular para abrir o cardápio e ativar a sessão da mesa.
              </span>
            </div>

            <button
              onClick={() => setSelectedQrTable(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Nova Mesa */}
      {isNewTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-tappo-surface border border-zinc-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-black text-white">Provisionar Nova Mesa</h3>
            <p className="text-xs text-zinc-400">
              O sistema gerará um token NFC aleatório de 6 caracteres único sem caracteres ambíguos.
            </p>

            <form onSubmit={handleCreateTable} className="flex flex-col gap-4">
              <div>
                <label className="text-zinc-400 font-bold block mb-1 text-xs">
                  Identificação da Mesa
                </label>
                <input
                  type="text"
                  required
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  placeholder="Ex: Mesa 09"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white text-xs font-bold shadow-solid-red"
                >
                  Gerar Tag NFC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableNfcProvisioner;
