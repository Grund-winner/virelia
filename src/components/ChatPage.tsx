'use client';

import { useEffect, useRef } from 'react';
import { useAppStore, type Companion } from '@/store';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Menu, MoreVertical, MessageCircle } from 'lucide-react';

interface ChatPageProps {
  onNewCompanion: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onCompanionSettings: (companion: Companion) => void;
  onLogout: () => void;
}

function getAvatarUrl(avatar: string, name: string) {
  if (avatar) return avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C5CFC&color=fff&size=128&bold=true`;
}

export default function ChatPage({
  onNewCompanion,
  onProfileClick,
  onSettingsClick,
  onCompanionSettings,
  onLogout,
}: ChatPageProps) {
  const {
    activeCompanion,
    messages,
    setMessages,
    addMessages,
    toggleSidebar,
    companions,
    setActiveCompanion,
  } = useAppStore();

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string>('');

  // Load messages when active companion changes
  useEffect(() => {
    if (!activeCompanion) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/messages?companion_id=${activeCompanion.id}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setMessages(data.messages);
          if (data.messages.length > 0) {
            lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
          }
        }
      } catch (error) {
        console.error('Load messages error:', error);
      }
    };

    loadMessages();

    // Poll for new messages every 3 seconds
    pollRef.current = setInterval(async () => {
      if (!lastMessageIdRef.current) return;
      try {
        const res = await fetch(
          `/api/messages?companion_id=${activeCompanion.id}&last_id=${lastMessageIdRef.current}`
        );
        const data = await res.json();
        if (!cancelled && data.success && data.messages && data.messages.length > 0) {
          addMessages(data.messages);
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
        }
      } catch (error) {
        // ignore polling errors
      }
    }, 3000);

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [activeCompanion, setMessages, addMessages]);

  // Update lastMessageIdRef when messages change
  useEffect(() => {
    if (messages.length > 0) {
      lastMessageIdRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  // Load companions on mount
  useEffect(() => {
    const loadCompanions = async () => {
      try {
        const res = await fetch('/api/companions?action=list');
        const data = await res.json();
        if (data.success) {
          const companionsList = data.companions;
          useAppStore.getState().setCompanions(companionsList);
          // Auto select first companion if none selected
          if (companionsList.length > 0 && !useAppStore.getState().activeCompanion) {
            setActiveCompanion(companionsList[0]);
          }
        }
      } catch (error) {
        console.error('Load companions error:', error);
      }
    };
    loadCompanions();
  }, [setActiveCompanion]);

  return (
    <div className="flex h-screen bg-[#F4F5FA] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onNewCompanion={onNewCompanion}
        onProfileClick={onProfileClick}
        onSettingsClick={onSettingsClick}
        onCompanionSettings={onCompanionSettings}
        onLogout={onLogout}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeCompanion ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-[#E5E4F0] shadow-sm">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-xl hover:bg-[#F4F5FA] transition-colors"
              >
                <Menu className="w-5 h-5 text-[#4B4880]" />
              </button>

              <img
                src={getAvatarUrl(activeCompanion.avatar, activeCompanion.name)}
                alt={activeCompanion.name}
                className="w-10 h-10 rounded-full object-cover"
              />

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-[#1E1B4B] truncate">{activeCompanion.name}</h2>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  En ligne
                </p>
              </div>

              <button
                onClick={() => onCompanionSettings(activeCompanion)}
                className="p-2 rounded-xl hover:bg-[#F4F5FA] transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-[#9896BF]" />
              </button>
            </div>

            {/* Messages */}
            <MessageList />

            {/* Input */}
            <MessageInput />
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#F4F5FA] px-4">
            <div className="hidden lg:block">
              <button
                onClick={toggleSidebar}
                className="mb-6 p-2 rounded-xl hover:bg-[#E5E4F0] transition-colors"
              >
                <Menu className="w-6 h-6 text-[#9896BF]" />
              </button>
            </div>
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
            >
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E1B4B] mb-2">Bienvenue sur Virelia</h3>
            <p className="text-[#9896BF] text-center max-w-sm">
              Sélectionnez un compagnon dans la barre latérale ou créez-en un nouveau pour commencer à discuter.
            </p>
            {companions.length === 0 && (
              <button
                onClick={onNewCompanion}
                className="mt-6 px-6 py-3 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
              >
                Créer mon premier compagnon
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
