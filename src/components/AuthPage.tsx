'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthPageProps {
  initialTab?: 'login' | 'register';
  onAuth: () => void;
  onBack: () => void;
}

export default function AuthPage({ initialTab = 'login', onAuth, onBack }: AuthPageProps) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'register') {
        if (password !== confirm) {
          setError('Les mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: tab,
          username,
          password,
          ...(tab === 'register' ? { confirm } : {}),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onAuth();
      } else {
        setError(data.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F4F5FA] flex items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7C5CFC 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#4B4880] hover:text-[#7C5CFC] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Retour</span>
        </button>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md"
              style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
            >
              <img
                src="/virelia-logo.png"
                alt="Virelia"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#1E1B4B]">
              {tab === 'login' ? 'Connexion' : 'Inscription'}
            </h2>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-[#F4F5FA] rounded-xl p-1 mb-6">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                tab === 'login'
                  ? 'bg-white text-[#7C5CFC] shadow-sm'
                  : 'text-[#9896BF] hover:text-[#4B4880]'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                tab === 'register'
                  ? 'bg-white text-[#7C5CFC] shadow-sm'
                  : 'text-[#9896BF] hover:text-[#4B4880]'
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"
              >
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#4B4880] mb-1.5">
                Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all"
                placeholder="votre_nom"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4B4880] mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9896BF] hover:text-[#4B4880] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {tab === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm font-medium text-[#4B4880] mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Chargement...</span>
                </>
              ) : tab === 'login' ? (
                'Se connecter'
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
