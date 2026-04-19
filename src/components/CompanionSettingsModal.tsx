'use client';

import { useState, useEffect } from 'react';
import { useAppStore, type Companion } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Upload, Trash2, AlertTriangle } from 'lucide-react';

interface CompanionSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companion: Companion | null;
}

const personalities = [
  { value: 'ami', label: 'Ami', emoji: '👋' },
  { value: 'copain', label: 'Copain', emoji: '😎' },
  { value: 'copine', label: 'Copine', emoji: '💕' },
];

export default function CompanionSettingsModal({ open, onOpenChange, companion }: CompanionSettingsModalProps) {
  const { setActiveCompanion, setCompanions } = useAppStore();
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('ami');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (companion && open) {
      setName(companion.name);
      setPersonality(companion.personality);
      setAvatar(companion.avatar);
      setShowDeleteConfirm(false);
    }
  }, [companion, open]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companion || !name.trim()) return;

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('action', 'update');
      formData.append('companion_id', companion.id);
      formData.append('name', name.trim());
      formData.append('personality', personality);
      formData.append('avatar', avatar);

      const res = await fetch('/api/companions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        // Update store
        const updatedCompanion = { ...companion, name: name.trim(), personality, avatar };
        setActiveCompanion(updatedCompanion);
        // Refresh companions list
        const companionsRes = await fetch('/api/companions?action=list');
        const companionsData = await companionsRes.json();
        if (companionsData.success) {
          setCompanions(companionsData.companions);
        }
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

  const handleDelete = async () => {
    if (!companion) return;

    setDeleteLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('companion_id', companion.id);

      const res = await fetch('/api/companions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setActiveCompanion(null);
        // Refresh companions list
        const companionsRes = await fetch('/api/companions?action=list');
        const companionsData = await companionsRes.json();
        if (companionsData.success) {
          setCompanions(companionsData.companions);
        }
        onOpenChange(false);
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatar) return avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'C')}&background=7C5CFC&color=fff&size=128&bold=true`;
  };

  if (!companion) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-[#E5E4F0] rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1E1B4B]">
            Paramètres du compagnon
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 mt-2">
          {/* Avatar */}
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#4B4880] mb-1.5">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all"
              required
              maxLength={30}
            />
          </div>

          {/* Personality */}
          <div>
            <label className="block text-sm font-medium text-[#4B4880] mb-2">Personnalité</label>
            <div className="grid grid-cols-3 gap-2">
              {personalities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPersonality(p.value)}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                    personality === p.value
                      ? 'border-[#7C5CFC] bg-[#7C5CFC]/5'
                      : 'border-[#E5E4F0] hover:border-[#7C5CFC]/30'
                  }`}
                >
                  <span className="text-2xl block mb-1">{p.emoji}</span>
                  <span className={`text-xs font-medium ${personality === p.value ? 'text-[#7C5CFC]' : 'text-[#4B4880]'}`}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Save */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sauvegarder'}
          </button>

          {/* Delete section */}
          <div className="border-t border-[#E5E4F0] pt-4">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 rounded-xl font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer ce compagnon
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    Êtes-vous sûr ? Toutes les conversations seront supprimées définitivement.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 py-2 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-lg font-medium text-[#4B4880] bg-white border border-[#E5E4F0] hover:bg-[#F4F5FA] transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
