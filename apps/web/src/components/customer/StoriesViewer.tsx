import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { X, Check } from 'lucide-react';

interface StoriesViewerProps {
  stories: MenuItem[];
  tableLabel?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
}

export const StoriesViewer: React.FC<StoriesViewerProps> = ({
  stories,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [added, setAdded] = useState(false);

  const STORY_DURATION_MS = 5000;
  const currentStory = stories[currentIndex] || stories[0];

  useEffect(() => {
    if (!isOpen || stories.length === 0 || isPaused) return;

    const interval = 50;
    const step = (interval / STORY_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, currentIndex, isPaused, stories.length, onClose]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((idx) => idx + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
      setProgress(0);
    }
  };

  const handleAdd = () => {
    onAddToCart(currentStory);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  if (!isOpen || !currentStory) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
    >
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Foto do prato em tela cheia */}
        <div className="absolute inset-0 z-0">
          <img
            src={currentStory.image_url}
            alt={currentStory.name}
            className="w-full h-full object-cover brightness-[0.85]"
          />
          {/* Gradiente escuro sutil apenas na base para legibilidade do texto */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        {/* Top Header: Barras de Progresso Amarelas + tappo + Fechar */}
        <div className="relative z-20 p-4 pt-5 flex flex-col gap-3">
          {/* Barras de progresso segmentadas */}
          <div className="flex gap-1.5 w-full">
            {stories.map((st, idx) => {
              let fillWidth = '0%';
              if (idx < currentIndex) fillWidth = '100%';
              else if (idx === currentIndex) fillWidth = `${progress}%`;

              return (
                <div
                  key={st.id || idx}
                  className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-tappo-yellow transition-all duration-75 ease-linear rounded-full"
                    style={{ width: fillWidth }}
                  />
                </div>
              );
            })}
          </div>

          {/* Linha superior: Marca 'tappo' e Botão de Fechar 'X' */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-white font-black text-lg tracking-tight lowercase">
              tappo
            </span>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition active:scale-90"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Zonas de toque laterais para avançar/voltar */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/2 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-1/2 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Conteúdo Inferior (Fiel à imagem 1 direita) */}
        <div className="relative z-20 p-5 pb-8 flex flex-col items-start text-left">
          {/* Badge Amarela */}
          <div className="bg-tappo-yellow text-black font-black text-[11px] px-3 py-1 rounded-full mb-2 uppercase tracking-wide">
            {currentStory.is_best_seller ? 'Mais pedido da casa' : 'Destaque da casa'}
          </div>

          {/* Nome Grande do Prato */}
          <h2 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
            {currentStory.name}
          </h2>

          {/* Descrição */}
          <p className="text-xs text-white/85 leading-relaxed max-w-sm mb-3">
            {currentStory.description}
          </p>

          {/* Preço em Destaque */}
          <span className="text-2xl font-black text-tappo-yellow mb-5">
            {formatCurrency(currentStory.price_cents)}
          </span>

          {/* Dois Botões Inferiores: 'Ver no cardápio' e 'Adicionar ao pedido' */}
          <div className="w-full flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 rounded-xl border border-white/60 bg-black/40 hover:bg-black/60 text-white text-xs font-bold transition active:scale-95 text-center"
            >
              Ver no cardápio
            </button>

            <button
              onClick={handleAdd}
              className="flex-1 py-3.5 px-4 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white text-xs font-black transition active:scale-95 text-center flex items-center justify-center gap-1.5 shadow-solid-red"
            >
              {added ? (
                <>
                  <Check size={16} /> Adicionado!
                </>
              ) : (
                'Adicionar ao pedido'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoriesViewer;
