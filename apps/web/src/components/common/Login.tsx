import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TappoLogo from './TappoLogo';
import { Mail, Key, Loader2, Sparkles, LogIn } from 'lucide-react';

interface LoginProps {
  onSuccess?: () => void;
  defaultRole?: 'SUPER_ADMIN' | 'RESTAURANT_OWNER';
}

export const Login: React.FC<LoginProps> = ({ defaultRole }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar');
    } finally {
      setIsLoading(false);
    }
  };

  const setQuickCreds = (type: 'admin' | 'chefe') => {
    if (type === 'admin') {
      setEmail('admin@tappo.app');
      setPassword('admin123');
    } else {
      setEmail('chefe@smashco.com');
      setPassword('chefe123');
    }
  };

  return (
    <div className="min-h-screen bg-[#141212] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-[#1C1818] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <TappoLogo size="lg" variant="red" />
          <h2 className="text-base font-bold text-white mt-4">
            Acesso ao Sistema
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Salão ao Vivo & Coordenação tappo
          </p>
        </div>

        {/* Atalhos Rápidos de Demonstração */}
        <div className="p-3 rounded-2xl bg-[#141212] border border-zinc-800 flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-tappo-red flex items-center gap-1">
            <Sparkles size={12} /> Acesso Demo 1-Clique
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setQuickCreds('chefe')}
              className="flex-1 py-2 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition"
            >
              👨‍🍳 Chefe Salão
            </button>
            <button
              type="button"
              onClick={() => setQuickCreds('admin')}
              className="flex-1 py-2 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition"
            >
              🛡️ Super Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="text-zinc-400 font-bold block mb-1">E-mail</label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#141212] border border-zinc-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-tappo-red"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 font-bold block mb-1">Senha</label>
            <div className="relative flex items-center">
              <Key size={16} className="absolute left-3 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#141212] border border-zinc-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-tappo-red"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-xl bg-tappo-red hover:bg-tappo-red-hover text-white text-sm font-black flex items-center justify-center gap-2 transition active:scale-95 shadow-solid-red"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Entrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn size={16} /> Entrar
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
