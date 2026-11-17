import React from 'react';
import { TableCall } from '../../types';
import { formatCurrency, formatTimeAgo } from '../../utils/formatters';
import { Bell, Receipt, Check, CreditCard, Banknote, QrCode } from 'lucide-react';

interface CallsQueueProps {
  calls: TableCall[];
  onCompleteCall: (callId: string) => void;
  onCloseTableSession?: (sessionId: string, tableLabel: string) => void;
}

export const CallsQueue: React.FC<CallsQueueProps> = ({
  calls,
  onCompleteCall,
  onCloseTableSession,
}) => {
  if (calls.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center flex flex-col items-center">
        <Bell size={36} className="text-zinc-600 mb-2" />
        <span className="text-sm font-semibold text-zinc-400">
          Nenhum chamado de garçom ou conta pendente
        </span>
        <span className="text-xs text-zinc-600 mt-0.5">
          O salão está em dia! Novos chamados tocarão um alerta sonoro.
        </span>
      </div>
    );
  }

  const paymentIconMap: Record<string, React.ReactNode> = {
    CREDIT: <CreditCard size={15} />,
    DEBIT: <CreditCard size={15} />,
    PIX: <QrCode size={15} />,
    CASH: <Banknote size={15} />,
  };

  const paymentLabelMap: Record<string, string> = {
    CREDIT: 'Cartão de Crédito',
    DEBIT: 'Cartão de Débito',
    PIX: 'Chave Pix (QR Code)',
    CASH: 'Dinheiro',
  };

  return (
    <div className="flex flex-col gap-3">
      {calls.map((call) => {
        const isBill = call.type === 'BILL';

        return (
          <div
            key={call.id}
            className={`rounded-2xl p-4 border transition-all ${
              isBill
                ? 'bg-zinc-900/90 border-amber-500/50 shadow-sm'
                : 'bg-zinc-900/90 border-rose-500/50 shadow-sm'
            }`}
          >
            {/* Header do Chamado */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span
                  className={`p-1.5 rounded-lg ${
                    isBill
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isBill ? <Receipt size={16} /> : <Bell size={16} />}
                </span>

                <div className="flex flex-col">
                  <span className="text-sm font-black text-white font-display">
                    {call.table?.label || 'Mesa'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {formatTimeAgo(call.created_at)}
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isBill
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {isBill ? 'Conta Solicitada' : 'Garçom na Mesa'}
              </span>
            </div>

            {/* Corpo do Chamado */}
            <div className="py-3 text-xs">
              {isBill ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                    <span className="text-tappo-secondary">
                      {paymentIconMap[call.payment_method || 'CREDIT']}
                    </span>
                    <span className="font-semibold">
                      Levar maquininha:{' '}
                      <strong className="text-white">
                        {paymentLabelMap[call.payment_method || 'CREDIT']}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-300 px-1">
                    <span>Gorjeta 10% incluída:</span>
                    <span className="font-bold">
                      {call.include_tip ? 'Sim (10%)' : 'Não'}
                    </span>
                  </div>

                  {call.estimated_total_cents && (
                    <div className="flex items-baseline justify-between px-1 pt-1 border-t border-zinc-800">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase">
                        Valor Total Estimado
                      </span>
                      <span className="text-base font-black text-emerald-400">
                        {formatCurrency(call.estimated_total_cents)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400 text-[11px]">Motivo do chamado:</span>
                  <span className="text-sm font-bold text-white bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-700/50">
                    {call.reason || 'Atendimento Geral'}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
              {isBill && onCloseTableSession && (
                <button
                  onClick={() =>
                    onCloseTableSession(call.session_id, call.table?.label || 'Mesa')
                  }
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition active:scale-95"
                >
                  Fechar Mesa
                </button>
              )}

              <button
                onClick={() => onCompleteCall(call.id)}
                className="py-2 px-4 rounded-xl bg-tappo-primary hover:bg-tappo-primary-hover text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-cyber-purple"
              >
                <Check size={14} />
                <span>Atender / Concluir</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CallsQueue;
