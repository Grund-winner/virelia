'use client';

import { useAppStore, type Companion } from '@/store';
import { formatTimeShort } from '@/lib/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, LogOut, X, Sparkles } from 'lucide-react';

interface SidebarProps {
  onNewCompanion: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onCompanionSettings: (companion: Companion) => void;
  onLogout: () => void;
}

function getPersonalityLabel(p: string) {
  switch (p) {
    case 'ami': return 'Ami';
    case 'ami_proche': return 'Ami';
    case 'copain': return 'Copain';
    case 'copine': return 'Copine';
    default: return p;
  }
}

function getAvatarUrl(avatar: string, name: string) {
  if (avatar) return avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C5CFC&color=fff&size=128&bold=true`;
}

export default function Sidebar({ onNewCompanion, onProfileClick, onSettingsClick, onCompanionSettings, onLogout }: SidebarProps) {
  const { user, companions, activeCompanion, setActiveCompanion, isSidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:relative top-0 left-0 h-full z-50 lg:z-auto w-[85vw] max-w-80 lg:w-80 flex flex-col bg-white/80 backdrop-blur-xl border-r border-[#E5E4F0] transition-transform lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5E4F0]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
              >
                <img src="/virelia-logo.png" alt="V" className="w-6 h-6 object-contain" />
              </div>
              <h1 className="text-lg font-bold text-[#1E1B4B]">Virelia</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-[#F4F5FA] transition-colors"
            >
              <X className="w-5 h-5 text-[#4B4880]" />
            </button>
          </div>

          {/* Profile */}
          {user && (
            <button
              onClick={onProfileClick}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F4F5FA] transition-colors group"
            >
              <div className="relative">
                <img
                  src={getAvatarUrl(user.avatar, user.displayName || user.username)}
                  alt={user.displayName || user.username}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7C5CFC]/20"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm text-[#1E1B4B] truncate">
                  {user.displayName || user.username}
                </p>
                <p className="text-xs text-[#9896BF] truncate">En ligne</p>
              </div>
            </button>
          )}
        </div>

        {/* New companion button */}
        <div className="px-4 pt-4">
          <button
            onClick={onNewCompanion}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau compagnon</span>
          </button>
        </div>

        {/* Companions list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          {companions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="w-10 h-10 text-[#9896BF] mb-3" />
              <p className="text-sm text-[#9896BF]">Aucun compagnon</p>
              <p className="text-xs text-[#9896BF] mt-1">Créez votre premier compagnon IA</p>
            </div>
          ) : (
            <div className="space-y-1">
              {companions.map((companion) => (
                <button
                  key={companion.id}
                  onClick={() => {
                    setActiveCompanion(companion);
                    setSidebarOpen(false);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onCompanionSettings(companion);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                    activeCompanion?.id === companion.id
                      ? 'bg-[#7C5CFC]/10 border border-[#7C5CFC]/20'
                      : 'hover:bg-[#F4F5FA] border border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getAvatarUrl(companion.avatar, companion.name)}
                      alt={companion.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-[#1E1B4B] truncate">{companion.name}</p>
                      {companion.lastTime && (
                        <span className="text-xs text-[#9896BF] flex-shrink-0 ml-2">
                          {formatTimeShort(companion.lastTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                        style={{
                          background: companion.personality === 'copine' ? 'rgba(124, 92, 252, 0.15)' :
                            companion.personality === 'copain' ? 'rgba(59, 130, 246, 0.15)' :
                            companion.personality === 'ami_proche' ? 'rgba(34, 211, 238, 0.15)' : '#F4F5FA',
                          color: companion.personality === 'copine' ? '#7C5CFC' :
                            companion.personality === 'copain' ? '#3B82F6' :
                            companion.personality === 'ami_proche' ? '#0891B2' : '#4B4880',
                        }}
                      >
                        {getPersonalityLabel(companion.personality)}
                      </span>
                      <p className="text-xs text-[#9896BF] truncate">{companion.lastMessage || companion.greeting}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E4F0]">
          <div className="flex items-center gap-2">
            <button
              onClick={onSettingsClick}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[#4B4880] hover:bg-[#F4F5FA] transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Paramètres</span>
            </button>

            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
