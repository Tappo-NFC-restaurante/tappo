import React, { useState } from 'react';
import { X, CreditCard, Banknote, QrCode, Minus, Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { getClientCoordinates } from '../../utils/geoloc';

export interface ConsumedItem {
  id: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

interface BillDrawerProps {
  isOpen: boolean;
  tableLabel: string;
  items: ConsumedItem[];
  onClose: () => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onConfirmBill: (data: {
    paymentMethod: 'CREDIT' | 'DEBIT' | 'PIX' | 'CASH';
    includeTip: boolean;
    estimatedTotalCents: number;
    clientCoords?: { latitude: number; longitude: number } | null;
  }) => Promise<{ success: boolean; message?: string }>;
}

export const BillDrawer: React.FC<BillDrawerProps> = ({
  isOpen,
  tableLabel,
  items,
  onClose,
  onUpdateQuantity,
  onConfirmBill,
}) => {
  const [includeTip, setIncludeTip] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<'CREDIT' | 'DEBIT' | 'PIX' | 'CASH'>('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const subtotalCents = items.reduce(
    (acc, item) => acc + item.unitPriceCents * item.quantity,
    0
  );
  const tipCents = includeTip ? Math.round(subtotalCents * 0.1) : 0;
  const totalCents = subtotalCents + tipCents;

  const paymentMethods: Array<{
    id: 'CREDIT' | 'DEBIT' | 'PIX' | 'CASH';
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'PIX', label: 'Pix', icon: <QrCode size={18} /> },
    { id: 'CREDIT', label: 'Crédito', icon: <CreditCard size={18} /> },
    { id: 'DEBIT', label: 'Débito', icon: <CreditCard size={18} /> },
    { id: 'CASH', label: 'Dinheiro', icon: <Banknote size={18} /> },
  ];

  const handleConfirm = async () => {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const coords = await getClientCoordinates();
      const res = await onConfirmBill({
        paymentMethod: selectedMethod,
        includeTip,
        estimatedTotalCents: totalCents,
        clientCoords: coords,
      });

      if (res.success) {
        setFeedback(res.message || 'Conta pedida! O garçom já está trazendo a maquininha.');
        setTimeout(() => {
          onClose();
          setFeedback(null);
        }, 2000);
      }
    } catch (e: any) {
      setFeedback(e.message || 'Erro ao pedir conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 transition-all duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] bg-tappo-surface border-t border-tappo-border rounded-t-3xl p-5 pb-8 shadow-2xl flex flex-col gap-4 overflow-y-auto no-scrollbar">
        {/* Indicador de arraste */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-tappo-red uppercase tracking-wider">
            {tableLabel}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Título */}
        <h2 className="text-xl font-black text-white">Pedir a Conta</h2>

        {/* Lista de Consumo */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Consumo da Mesa
          </span>

          {items.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400">
              Nenhum item consumido ainda.
            </div>
          ) : (
            <div className="flex flex-col gap-2 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className="text-[11px] text-zinc-400">
                      {formatCurrency(item.unitPriceCents)} cada
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-zinc-800 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        className="text-zinc-400 hover:text-white p-0.5"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold text-white px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="text-zinc-400 hover:text-white p-0.5"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="text-xs font-black text-white min-w-[65px] text-right">
                      {formatCurrency(item.unitPriceCents * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totais & 10% */}
        <div className="flex flex-col gap-2 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Subtotal</span>
            <span className="font-semibold text-zinc-200">
              {formatCurrency(subtotalCents)}
            </span>
          </div>

          <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer select-none py-1 border-t border-zinc-800 mt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeTip}
                onChange={(e) => setIncludeTip(e.target.checked)}
                className="w-4 h-4 rounded text-tappo-red bg-zinc-800 border-zinc-700"
              />
              <span>Gorjeta de 10% sugerida</span>
            </div>
            <span className="font-semibold text-zinc-400">
              {formatCurrency(tipCents)}
            </span>
          </label>

          <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800 mt-1">
            <span className="text-sm font-black text-white">Total a Pagar</span>
            <span className="text-xl font-black text-white tracking-tight">
              {formatCurrency(totalCents)}
            </span>
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Como deseja pagar?
          </span>

          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map((pm) => {
              const isSelected = selectedMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setSelectedMethod(pm.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition border ${
                    isSelected
                      ? 'bg-tappo-red text-white border-tappo-red shadow-solid-red'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{pm.icon}</span>
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl text-xs font-bold text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {feedback}
          </div>
        )}

        {/* Botão de Envio */}
        <button
          onClick={handleConfirm}
          disabled={items.length === 0 || isSubmitting}
          className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            items.length === 0
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-tappo-red hover:bg-tappo-red-hover text-white shadow-solid-red'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Solicitando...
            </span>
          ) : (
            `Pedir Conta • ${paymentMethods.find((p) => p.id === selectedMethod)?.label}`
          )}
        </button>
      </div>
    </div>
  );
};

export default BillDrawer;
