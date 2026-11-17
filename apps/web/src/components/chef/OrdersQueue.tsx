import React from 'react';
import { Order } from '../../types';
import { formatCurrency, formatTimeAgo } from '../../utils/formatters';
import { ChefHat, CheckCircle2, MapPin, Clock, ArrowRight } from 'lucide-react';

interface OrdersQueueProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: 'PREPARING' | 'DELIVERED') => void;
}

export const OrdersQueue: React.FC<OrdersQueueProps> = ({ orders, onUpdateStatus }) => {
  if (orders.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center flex flex-col items-center">
        <ChefHat size={36} className="text-zinc-600 mb-2" />
        <span className="text-sm font-semibold text-zinc-400">
          Nenhum pedido pendente na cozinha
        </span>
        <span className="text-xs text-zinc-600 mt-0.5">
          Novos pedidos enviados pelas mesas aparecerão aqui instantaneamente.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => {
        const isPreparing = order.status === 'PREPARING';

        return (
          <div
            key={order.id}
            className={`rounded-2xl p-4 border transition-all ${
              isPreparing
                ? 'bg-zinc-900/90 border-amber-500/40 shadow-sm'
                : 'bg-zinc-900/95 border-tappo-primary/50 shadow-cyber-purple'
            }`}
          >
            {/* Top Bar do Pedido */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white font-display">
                  {order.table?.label || 'Mesa'}
                </span>

                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <Clock size={12} />
                  <span>{formatTimeAgo(order.created_at)}</span>
                </div>
              </div>

              {/* Status do Geofencing */}
              <div
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  order.location_verified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
                title={
                  order.location_verified
                    ? 'Pedido confirmado dentro do restaurante'
                    : 'Pedido sem confirmação de GPS (possível pedido remoto)'
                }
              >
                <MapPin size={11} />
                <span>
                  {order.location_verified ? 'No Restaurante' : 'Local Não Verificado'}
                </span>
              </div>
            </div>

            {/* Lista de Itens do Pedido */}
            <div className="py-3 flex flex-col gap-1.5">
              {order.items.map((oi) => (
                <div key={oi.id} className="flex items-baseline justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-white font-bold flex items-center justify-center text-[11px] border border-zinc-700">
                      {oi.quantity}x
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {oi.menu_item?.name || 'Prato'}
                    </span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {formatCurrency(oi.unit_price_cents * oi.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Rodapé: Total e Botão de Avanço de Status */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Total</span>
                <span className="text-sm font-black text-white">
                  {formatCurrency(order.total_cents)}
                </span>
              </div>

              {order.status === 'PENDING' ? (
                <button
                  onClick={() => onUpdateStatus(order.id, 'PREPARING')}
                  className="py-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
                >
                  <span>Iniciar Preparo</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
                  className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition shadow-sm"
                >
                  <CheckCircle2 size={14} />
                  <span>Marcar Entregue</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrdersQueue;
