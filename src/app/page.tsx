'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, type Companion } from '@/store';
import Landing from '@/components/Landing';
import AuthPage from '@/components/AuthPage';
import ChatPage from '@/components/ChatPage';
import AdminPage from '@/components/AdminPage';
import CreateCompanionModal from '@/components/CreateCompanionModal';
import ProfileModal from '@/components/ProfileModal';
import CompanionSettingsModal from '@/components/CompanionSettingsModal';

type View = 'landing' | 'auth' | 'chat' | 'admin';

export default function Home() {
  const { user, setUser, setActiveCompanion, setCompanions } = useAppStore();
  const [view, setView] = useState<View>('landing');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [checking, setChecking] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [companionSettingsOpen, setCompanionSettingsOpen] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.loggedIn && data.user) {
          setUser(data.user);
          setView('chat');
        } else {
          setView('landing');
        }
      } catch {
        setView('landing');
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, [setUser]);

  // Handle successful auth
  const handleAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.loggedIn && data.user) {
        setUser(data.user);
        setView('chat');
      }
    } catch {
      // ignore
    }
  }, [setUser]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore
    }
    setUser(null);
    setActiveCompanion(null);
    setCompanions([]);
    setView('landing');
  }, [setUser, setActiveCompanion, setCompanions]);

  // Handle companion created
  const handleCompanionCreated = useCallback(async (companionId: string) => {
    // Refresh companions list
    try {
      const res = await fetch('/api/companions?action=list');
      const data = await res.json();
      if (data.success) {
        setCompanions(data.companions);
        const newCompanion = data.companions.find((c: Companion) => c.id === companionId);
        if (newCompanion) {
          setActiveCompanion(newCompanion);
        }
      }
    } catch {
      // ignore
    }
  }, [setCompanions, setActiveCompanion]);

  // Handle companion settings
  const handleCompanionSettings = useCallback((companion: Companion) => {
    setSelectedCompanion(companion);
    setCompanionSettingsOpen(true);
  }, []);

  // Loading state while checking session
  if (checking) {
    return (
      <div className="min-h-screen bg-[#F4F5FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg animate-pulse"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
          >
            <img src="/virelia-logo.png" alt="Virelia" className="w-9 h-9 object-contain" />
          </div>
          <p className="text-sm text-[#9896BF]">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'landing' && (
        <Landing
          onLogin={() => { setAuthTab('login'); setView('auth'); }}
          onRegister={() => { setAuthTab('register'); setView('auth'); }}
        />
      )}

      {view === 'auth' && (
        <AuthPage
          initialTab={authTab}
          onAuth={handleAuth}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'chat' && (
        <ChatPage
          onNewCompanion={() => setCreateModalOpen(true)}
          onProfileClick={() => setProfileModalOpen(true)}
          onSettingsClick={() => setProfileModalOpen(true)}
          onCompanionSettings={handleCompanionSettings}
          onLogout={handleLogout}
          onAdminClick={() => setView('admin')}
        />
      )}

      {view === 'admin' && (
        <AdminPage onBack={() => setView(user ? 'chat' : 'landing')} />
      )}

      {/* Modals */}
      <CreateCompanionModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={handleCompanionCreated}
      />

      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />

      <CompanionSettingsModal
        open={companionSettingsOpen}
        onOpenChange={setCompanionSettingsOpen}
        companion={selectedCompanion}
      />
    </>
  );
}
