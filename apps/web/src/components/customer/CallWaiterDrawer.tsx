import React, { useState, useEffect } from 'react';
import { X, Bell, Loader2 } from 'lucide-react';

interface CallWaiterDrawerProps {
  isOpen: boolean;
  tableLabel: string;
  onClose: () => void;
  onConfirmCall: (reason?: string) => Promise<{ success: boolean; remainingSeconds?: number }>;
}

export const CallWaiterDrawer: React.FC<CallWaiterDrawerProps> = ({
  isOpen,
  tableLabel,
  onClose,
  onConfirmCall,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const reasons = [
    'talheres e guardanapos',
    'Fazer pedido ao atendente',
    'Dúvida sobre o cardápio',
    'Bebidas / Gelo e limão',
  ];

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleConfirm = async () => {
    if (cooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await onConfirmCall(selectedReason || undefined);
      if (res.success) {
        setFeedbackMessage('Garçom chamado! Já estamos a caminho da sua mesa.');
        setCooldown(60);
        setTimeout(() => {
          onClose();
          setFeedbackMessage(null);
          setSelectedReason('');
        }, 1600);
      } else if (res.remainingSeconds) {
        setCooldown(res.remainingSeconds);
        setFeedbackMessage(`Aguarde ${res.remainingSeconds}s antes de chamar novamente.`);
      }
    } catch (e: any) {
      setFeedbackMessage(e.message || 'Erro ao chamar atendimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 transition-all duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-tappo-surface border-t border-tappo-border rounded-t-3xl p-5 pb-8 shadow-2xl flex flex-col gap-4">
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
        <div>
          <h2 className="text-xl font-black text-white">Chamar Garçom</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Selecione um motivo rápido para agilizar seu atendimento:
          </p>
        </div>

        {/* Opções */}
        <div className="flex flex-col gap-2">
          {reasons.map((r) => {
            const isSelected = selectedReason === r;
            return (
              <button
                key={r}
                onClick={() => setSelectedReason(isSelected ? '' : r)}
                className={`py-3 px-4 rounded-xl text-xs font-bold text-left transition border ${
                  isSelected
                    ? 'bg-tappo-red/15 border-tappo-red text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-bold text-center ${
              feedbackMessage.includes('Erro') || feedbackMessage.includes('Aguarde')
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {feedbackMessage}
          </div>
        )}

        {/* Botão de Confirmação */}
        <button
          onClick={handleConfirm}
          disabled={cooldown > 0 || isSubmitting}
          className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            cooldown > 0
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-tappo-red hover:bg-tappo-red-hover text-white shadow-solid-red'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Chamando...
            </span>
          ) : cooldown > 0 ? (
            `Aguarde (${cooldown}s)`
          ) : (
            'Confirmar Chamado'
          )}
        </button>
      </div>
    </div>
  );
};

export default CallWaiterDrawer;
