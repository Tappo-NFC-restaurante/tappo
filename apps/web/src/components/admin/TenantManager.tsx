import React, { useState } from 'react';
import { Tenant } from '../../types';
import { Plus, Edit2, MapPin, Store, Check, X } from 'lucide-react';

interface TenantManagerProps {
  tenants: (Tenant & { _count?: { tables: number; users: number; menu_items: number } })[];
  token: string | null;
  onRefresh: () => void;
  onSelectTenantTables: (tenant: Tenant) => void;
}

export const TenantManager: React.FC<TenantManagerProps> = ({
  tenants,
  token,
  onRefresh,
  onSelectTenantTables,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('100');
  const [active, setActive] = useState(true);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    setName('');
    setSlug('');
    setSubtitle('Burgers Artesanais & Parrilla');
    setLogoUrl('https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&auto=format&fit=crop&q=80');
    setCoverUrl('https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80');
    setLatitude('-23.561684');
    setLongitude('-46.655981');
    setRadiusMeters('150');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setName(t.name);
    setSlug(t.slug);
    setSubtitle(t.subtitle || '');
    setLogoUrl(t.logo_url || '');
    setCoverUrl(t.cover_url || '');
    setLatitude(t.latitude != null ? String(t.latitude) : '');
    setLongitude(t.longitude != null ? String(t.longitude) : '');
    setRadiusMeters(String(t.radius_meters || 100));
    setActive(t.active);
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      slug,
      subtitle,
      logo_url: logoUrl,
      cover_url: coverUrl,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      radius_meters: parseInt(radiusMeters, 10) || 100,
      active,
    };

    try {
      if (editingTenant) {
        await fetch(`/api/admin/tenants/${editingTenant.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/admin/tenants', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Erro ao salvar restaurante:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header com Botão Cadastrar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white font-display">
            Restaurantes Cadastrados
          </h2>
          <p className="text-xs text-zinc-400">
            Gerencie os clientes SaaS e seus parâmetros de geofencing NFC
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition shadow-solid-red"
        >
          <Plus size={16} />
          <span>Novo Restaurante</span>
        </button>
      </div>

      {/* Grid de Tenants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((t) => (
          <div
            key={t.id}
            className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt={t.name}
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Store size={22} />
                    </div>
                  )}

                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {t.name}
                    </h3>
                    <span className="text-xs font-mono text-tappo-secondary">
                      /{t.slug}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    t.active
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {t.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {t.subtitle && (
                <p className="text-xs text-zinc-400 mb-3">{t.subtitle}</p>
              )}

              {/* Informações de Geofencing & Mesas */}
              <div className="flex flex-col gap-1.5 py-3 border-y border-zinc-800/80 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-zinc-500" />
                  <span>
                    {t.latitude && t.longitude
                      ? `Geofence Ativo (${t.radius_meters}m de raio)`
                      : 'Sem GPS configurado'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <span>Mesas: <strong>{t._count?.tables ?? 0}</strong></span>
                  <span>Pratos: <strong>{t._count?.menu_items ?? 0}</strong></span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between gap-2 pt-4">
              <button
                onClick={() => onSelectTenantTables(t)}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition active:scale-95 text-center"
              >
                Provisionar Mesas NFC
              </button>

              <button
                onClick={() => openEditModal(t)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-90"
                title="Editar restaurante"
              >
                <Edit2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação / Edição de Restaurante */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-tappo-surface border border-zinc-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white">
                {editingTenant ? 'Editar Restaurante' : 'Novo Restaurante (Tenant)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingTenant) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]/g, '-')
                        );
                      }
                    }}
                    placeholder="Ex: Smash & Co."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Slug da URL</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="smash-co"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Subtítulo / Especialidade</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Burgers Artesanais & Tex-Mex"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">URL da Logo</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white"
                />
              </div>

              {/* Parâmetros de Geofencing Anti-Trollagem */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-tappo-red flex items-center gap-1.5">
                  <MapPin size={13} />
                  Coordenadas do Salão (Anti-Trollagem Remota)
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Latitude</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="-23.561684"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Longitude</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="-46.655981"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Raio (Metros)</label>
                    <input
                      type="number"
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(e.target.value)}
                      placeholder="150"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Status Ativo */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-tappo-red bg-zinc-800"
                />
                <span className="text-zinc-300 font-bold">Restaurante Ativo</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white font-bold shadow-solid-red"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManager;
