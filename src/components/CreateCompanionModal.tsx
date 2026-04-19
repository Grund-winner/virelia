'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

interface CreateCompanionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (companionId: string) => void;
}

const personalities = [
  { value: 'ami', label: 'Ami', emoji: '👋', description: 'Un ami chaleureux et compréhensif' },
  { value: 'ami_proche', label: 'Ami proche', emoji: '🤗', description: 'Un ami intime qui vous connaît bien' },
  { value: 'copine', label: 'Copine', emoji: '💕', description: 'Une partenaire attentionnée et affectueuse' },
];

export default function CreateCompanionModal({ open, onOpenChange, onCreated }: CreateCompanionModalProps) {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('ami');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      // Resize to reduce size
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('action', 'create');
      formData.append('name', name.trim());
      formData.append('personality', personality);
      if (avatar) formData.append('avatar', avatar);

      const res = await fetch('/api/companions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        onCreated(data.companionId);
        setName('');
        setPersonality('ami');
        setAvatar('');
        onOpenChange(false);
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-[#E5E4F0] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1E1B4B] flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
            >
              <span className="text-white text-sm">✨</span>
            </span>
            Nouveau compagnon
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#E5E4F0] shadow-md">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
                  >
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-[#9896BF]">Cliquez pour ajouter une photo</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#4B4880] mb-1.5">Nom du compagnon</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Léa, Max, Chloé..."
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
                <motion.button
                  key={p.value}
                  type="button"
                  onClick={() => setPersonality(p.value)}
                  whileTap={{ scale: 0.95 }}
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
                </motion.button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3.5 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Création...</span>
              </>
            ) : (
              'Créer le compagnon'
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
