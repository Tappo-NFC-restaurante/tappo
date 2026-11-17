import React, { useState } from 'react';
import { Category, MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Edit2, Trash2, Check, X, Star, Sparkles, Image as ImageIcon } from 'lucide-react';

interface MenuEditorProps {
  categories: Category[];
  token?: string | null;
  onRefresh: () => void;
}

export const MenuEditor: React.FC<MenuEditorProps> = ({ categories, token, onRefresh }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    categories[0] || null
  );

  // Estados de modal de item
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriceReais, setFormPriceReais] = useState('34.90');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [formIsStoryHighlight, setFormIsStoryHighlight] = useState(false);
  const [formIsAvailable, setFormIsAvailable] = useState(true);

  // Estados de categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const openCreateItem = (catId?: string) => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormPriceReais('34.90');
    setFormImageUrl(
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80'
    );
    setFormCategoryId(catId || selectedCategory?.id || categories[0]?.id || '');
    setFormIsBestSeller(false);
    setFormIsStoryHighlight(false);
    setFormIsAvailable(true);
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description);
    setFormPriceReais((item.price_cents / 100).toFixed(2));
    setFormImageUrl(item.image_url);
    setFormCategoryId(item.category_id);
    setFormIsBestSeller(item.is_best_seller);
    setFormIsStoryHighlight(item.is_story_highlight);
    setFormIsAvailable(item.is_available);
    setIsItemModalOpen(true);
  };

  // Alternância rápida de disponibilidade
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await fetch(`/api/restaurant/items/${item.id}/availability`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      onRefresh();
    } catch (e) {
      console.error('Erro ao alternar disponibilidade:', e);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(formPriceReais.replace(',', '.')) * 100);

    const payload = {
      category_id: formCategoryId,
      name: formName,
      description: formDescription,
      price_cents: priceCents,
      image_url: formImageUrl,
      is_best_seller: formIsBestSeller,
      is_story_highlight: formIsStoryHighlight,
      is_available: formIsAvailable,
    };

    try {
      if (editingItem) {
        await fetch(`/api/restaurant/items/${editingItem.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/restaurant/items', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      }
      setIsItemModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Erro ao salvar item:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Deseja realmente remover este item do cardápio?')) return;
    try {
      await fetch(`/api/restaurant/items/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      onRefresh();
    } catch (err) {
      console.error('Erro ao excluir item:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;

    try {
      await fetch('/api/restaurant/categories', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: categoryName,
          icon: 'Utensils',
          sort_order: categories.length + 1,
        }),
      });
      setCategoryName('');
      setIsCategoryModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
    }
  };

  const activeCategory = selectedCategory || categories[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de Categorias com Botão Adicionar */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                activeCategory?.id === cat.id
                  ? 'bg-tappo-red text-white shadow-solid-red'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 active:scale-95 transition"
          >
            <Plus size={14} />
            <span>Nova Categoria</span>
          </button>

          <button
            onClick={() => openCreateItem(activeCategory?.id)}
            className="py-2 px-3.5 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition shadow-solid-red"
          >
            <Plus size={14} />
            <span>Adicionar Prato</span>
          </button>
        </div>
      </div>

      {/* Grid de Itens da Categoria Selecionada */}
      {activeCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeCategory.items.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex gap-4 items-center justify-between hover:border-zinc-700 transition"
            >
              {/* Thumbnail com Badges */}
              <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {!item.is_available && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-rose-400 uppercase">
                      Esgotado
                    </span>
                  </div>
                )}
              </div>

              {/* Informações Principais */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                  {item.is_best_seller && (
                    <span className="shrink-0 p-1 rounded bg-amber-500/20 text-amber-400" title="Mais Vendido">
                      <Star size={12} className="fill-amber-400" />
                    </span>
                  )}
                  {item.is_story_highlight && (
                    <span className="shrink-0 p-1 rounded bg-tappo-primary/20 text-tappo-secondary" title="Destaque Stories">
                      <Sparkles size={12} />
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 line-clamp-1 mb-2">
                  {item.description}
                </p>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-emerald-400">
                    {formatCurrency(item.price_cents)}
                  </span>

                  {/* Switch Rápido Disponível / Esgotado */}
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition active:scale-95 ${
                      item.is_available
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {item.is_available ? 'Disponível' : 'Esgotado'}
                  </button>
                </div>
              </div>

              {/* Ações de Edição e Exclusão */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => openEditItem(item)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-90"
                  title="Editar prato"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 transition active:scale-90"
                  title="Excluir prato"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Prato */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-tappo-surface border border-zinc-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-black text-white">
                {editingItem ? 'Editar Prato' : 'Adicionar Novo Prato'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex flex-col gap-4 text-xs">
              {/* Nome */}
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Nome do Prato</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Smash Clássico Supreme"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-tappo-red text-sm"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Categoria</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-tappo-red text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preço (R$) */}
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Preço em Reais (R$)</label>
                <input
                  type="text"
                  required
                  value={formPriceReais}
                  onChange={(e) => setFormPriceReais(e.target.value)}
                  placeholder="Ex: 34.90"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-tappo-red text-sm font-mono"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Descrição Detalhada</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva os ingredientes, ponto da carne, acompanhamentos..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-tappo-red text-sm resize-none"
                />
              </div>

              {/* URL da Foto */}
              <div>
                <label className="text-zinc-400 font-bold block mb-1">URL da Foto (HD)</label>
                <input
                  type="url"
                  required
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-tappo-red text-sm"
                />
              </div>

              {/* Switches de Destaque */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsBestSeller}
                    onChange={(e) => setFormIsBestSeller(e.target.checked)}
                    className="w-4 h-4 rounded text-tappo-red bg-zinc-800"
                  />
                  <span className="font-bold text-zinc-300">Selo Mais Pedido</span>
                </label>

                <label className="flex items-center gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsStoryHighlight}
                    onChange={(e) => setFormIsStoryHighlight(e.target.checked)}
                    className="w-4 h-4 rounded text-tappo-red bg-zinc-800"
                  />
                  <span className="font-bold text-zinc-300">Destaque Stories</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white font-bold shadow-solid-red"
                >
                  Salvar Prato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-tappo-surface border border-zinc-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-black text-white">Nova Categoria de Cardápio</h3>
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
              <input
                type="text"
                required
                placeholder="Ex: Entradas Especiais"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-tappo-red text-white text-xs font-bold shadow-solid-red"
                >
                  Criar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuEditor;
