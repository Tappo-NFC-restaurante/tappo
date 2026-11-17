import React from 'react';
import { Table } from '../../types';
import { formatTimeAgo } from '../../utils/formatters';

interface TableLiveGridProps {
  tables: Table[];
  onCloseSession: (sessionId: string, tableLabel: string) => void;
  onSelectTable?: (table: Table) => void;
}

export const TableLiveGrid: React.FC<TableLiveGridProps> = ({
  tables,
  onCloseSession,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
      {tables.map((table) => {
        const isOccupied = table.hasActiveSession && table.activeSession;
        const hasBill = table.activeSession?.hasBillRequest;

        // Estado 1: Pede a conta -> Cartão Amarelo Sólido
        if (hasBill) {
          return (
            <div
              key={table.id}
              onClick={() => onCloseSession(table.activeSession!.id, table.label)}
              className="cursor-pointer bg-tappo-yellow text-black p-4 rounded-2xl flex flex-col justify-between min-h-[95px] shadow-solid-yellow active:scale-95 transition"
            >
              <span className="text-base font-black tracking-tight">{table.label}</span>
              <span className="text-xs font-bold">Pede a conta</span>
            </div>
          );
        }

        // Estado 2: Ocupada -> Cartão Vermelho Sólido
        if (isOccupied) {
          return (
            <div
              key={table.id}
              onClick={() => onCloseSession(table.activeSession!.id, table.label)}
              className="cursor-pointer bg-tappo-red text-white p-4 rounded-2xl flex flex-col justify-between min-h-[95px] shadow-solid-red active:scale-95 transition"
            >
              <span className="text-base font-black tracking-tight">{table.label}</span>
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
            className="border-2 border-dashed border-zinc-800 text-zinc-500 p-4 rounded-2xl flex flex-col justify-between min-h-[95px]"
          >
            <span className="text-base font-bold text-zinc-400">{table.label}</span>
            <span className="text-xs text-zinc-600">Livre</span>
          </div>
        );
      })}
    </div>
  );
};

export default TableLiveGrid;
