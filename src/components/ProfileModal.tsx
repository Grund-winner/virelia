'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Upload, User, FileText, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = 'profile' | 'password' | 'danger';

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, setUser } = useAppStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && open) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
    }
  }, [user, open]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image trop volumineuse (2 Mo max)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
          setAvatar(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          displayName,
          bio,
          avatar,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (user) {
          setUser({ ...user, displayName, bio, avatar });
        }
        setSuccess('Profil mis à jour !');
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Mot de passe changé !');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_account',
          password: deletePassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUser(null);
        onOpenChange(false);
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatar) return avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || user?.username || 'U')}&background=7C5CFC&color=fff&size=128&bold=true`;
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'password', label: 'Sécurité', icon: Lock },
    { id: 'danger', label: 'Danger', icon: Trash2 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-[#E5E4F0] rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1E1B4B]">Paramètres du profil</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex bg-[#F4F5FA] rounded-xl p-1 mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-white text-[#7C5CFC] shadow-sm'
                  : 'text-[#9896BF] hover:text-[#4B4880]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3"
          >
            <p className="text-sm text-green-600">{success}</p>
          </motion.div>
        )}

        {/* Profile tab */}
        {tab === 'profile' && (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#E5E4F0] shadow-md">
                  <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4B4880] mb-1.5">
                <User className="w-3.5 h-3.5 inline mr-1" />
                Nom affiché
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4B4880] mb-1.5">
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all resize-none"
                placeholder="Parlez un peu de vous..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sauvegarder'}
            </button>
          </form>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#4B4880] mb-1.5">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B4880] mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Changer le mot de passe'}
            </button>
          </form>
        )}

        {/* Danger tab */}
        {tab === 'danger' && (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Zone dangereuse</p>
                <p className="text-xs text-red-600 mt-1">
                  La suppression de votre compte est irréversible. Toutes vos données, compagnons et messages seront définitivement supprimés.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B4880] mb-1.5">Confirmez avec votre mot de passe</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-red-200 bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-red-300/30 focus:border-red-400 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !deletePassword}
              className="w-full py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Supprimer mon compte'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
