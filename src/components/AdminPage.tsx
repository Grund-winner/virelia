'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Bot, MessageSquare, Calendar, Key, Activity,
  Loader2, Shield, Eye, Trash2, ChevronRight, CheckCircle, XCircle,
  LayoutDashboard, AlertTriangle,
} from 'lucide-react';

interface AdminStats {
  users: number;
  companions: number;
  messages: number;
  today: number;
}

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  lastActive: string;
  companionCount: number;
  messageCount: number;
}

interface AdminCompanion {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  greeting: string;
  isActive: boolean;
  createdAt: string;
  messageCount: number;
  lastMessage: string;
  lastTime: string;
}

interface AdminMessage {
  id: string;
  content: string;
  sender: string;
  createdAt: string;
}

interface AdminConversation {
  companion: {
    id: string;
    name: string;
    avatar: string;
    personality: string;
    username: string;
    displayName: string;
  };
  messages: AdminMessage[];
}

interface ProviderStatus {
  name: string;
  configured: boolean;
}

type AdminTab = 'dashboard' | 'users' | 'keys' | 'diagnostic';

function formatDateShort(d: string) {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatTimeAdmin(d: string) {
  try {
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function getAvatarUrl(avatar: string, name: string) {
  if (avatar) return avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C5CFC&color=fff&size=128&bold=true`;
}

function getPersonalityLabel(p: string) {
  switch (p) {
    case 'ami': return 'Ami';
    case 'ami_proche': return 'Ami proche';
    case 'copine': return 'Copine';
    default: return p;
  }
}

export default function AdminPage({ onBack }: { onBack: () => void }) {
  // onBack navigates to home page - admin is a separate route at /admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>('dashboard');

  // Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userCompanions, setUserCompanions] = useState<AdminCompanion[]>([]);
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AdminConversation | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check admin session on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/login');
        const data = await res.json();
        if (data.isAdmin) {
          setIsAdmin(true);
          loadStats();
        }
      } catch {
        // not admin
      }
    };
    checkAdmin();
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?action=users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserCompanions = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?action=user_companions&user_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setUserCompanions(data.companions);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (companionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?action=conversation&companion_id=${companionId}`);
      const data = await res.json();
      if (data.success) {
        setConversation(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiagnostic = useCallback(async () => {
    setDiagnosticLoading(true);
    try {
      const res = await fetch('/api/admin/diagnostic');
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch {
      // ignore
    } finally {
      setDiagnosticLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAdmin(true);
        loadStats();
      } else {
        setLoginError(data.error || 'Mot de passe incorrect');
      }
    } catch {
      setLoginError('Erreur de connexion');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur et toutes ses données ?')) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', userId }),
      });

      const data = await res.json();
      if (data.success) {
        loadUsers();
        loadStats();
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
          setUserCompanions([]);
        }
      }
    } catch {
      // ignore
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'dashboard') loadStats();
    if (tab === 'users') loadUsers();
    if (tab === 'diagnostic') loadDiagnostic();
  }, [tab, isAdmin, loadStats, loadUsers, loadDiagnostic]);

  // Login screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F5FA] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#4B4880] hover:text-[#7C5CFC] transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Retour</span>
          </button>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-8">
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md"
                style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
              >
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#1E1B4B]">Administration</h2>
              <p className="text-sm text-[#9896BF] mt-1">Accès réservé aux administrateurs</p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-600">{loginError}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4B4880] mb-1.5">Mot de passe admin</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E4F0] bg-white/50 text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
              >
                {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connexion'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Admin dashboard
  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'keys', label: 'Clés API', icon: Key },
    { id: 'diagnostic', label: 'Diagnostic', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#F4F5FA]">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#E5E4F0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-[#F4F5FA] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#4B4880]" />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
          >
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-[#1E1B4B]">Administration</h1>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[#7C5CFC]/10 text-[#7C5CFC]'
                  : 'text-[#9896BF] hover:text-[#4B4880] hover:bg-[#F4F5FA]'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard */}
        {tab === 'dashboard' && stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Utilisateurs', value: stats.users, icon: Users, color: '#7C5CFC', bg: 'rgba(124,92,252,0.1)' },
                { label: 'Compagnons', value: stats.companions, icon: Bot, color: '#22D3EE', bg: 'rgba(34,211,238,0.1)' },
                { label: 'Messages', value: stats.messages, icon: MessageSquare, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                { label: "Aujourd'hui", value: stats.today, icon: Calendar, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-[#E5E4F0] hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: stat.bg }}
                    >
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[#1E1B4B]">{stat.value}</p>
                  <p className="text-xs text-[#9896BF] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Users list */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E5E4F0] overflow-hidden">
                <div className="p-4 border-b border-[#E5E4F0]">
                  <h3 className="font-semibold text-[#1E1B4B] flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Utilisateurs ({users.length})
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {loading && users.length === 0 ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#7C5CFC] mx-auto" />
                    </div>
                  ) : (
                    users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          loadUserCompanions(u.id);
                          setSelectedCompanion(null);
                          setConversation(null);
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-[#F4F5FA] transition-colors border-b border-[#E5E4F0]/50 last:border-0 ${
                          selectedUser?.id === u.id ? 'bg-[#7C5CFC]/5' : ''
                        }`}
                      >
                        <img
                          src={getAvatarUrl(u.avatar, u.displayName || u.username)}
                          alt={u.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-sm text-[#1E1B4B] truncate">
                            {u.displayName || u.username}
                          </p>
                          <p className="text-xs text-[#9896BF]">
                            @{u.username} · {u.companionCount} compagnon{u.companionCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-[#9896BF]" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Companions list */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E5E4F0] overflow-hidden">
                <div className="p-4 border-b border-[#E5E4F0]">
                  <h3 className="font-semibold text-[#1E1B4B] flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    {selectedUser ? `Compagnons de ${selectedUser.displayName || selectedUser.username}` : 'Sélectionnez un utilisateur'}
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {!selectedUser ? (
                    <div className="p-8 text-center text-[#9896BF] text-sm">
                      <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Cliquez sur un utilisateur
                    </div>
                  ) : loading && userCompanions.length === 0 ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#7C5CFC] mx-auto" />
                    </div>
                  ) : userCompanions.length === 0 ? (
                    <div className="p-8 text-center text-[#9896BF] text-sm">Aucun compagnon</div>
                  ) : (
                    userCompanions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCompanion(c.id);
                          loadConversation(c.id);
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-[#F4F5FA] transition-colors border-b border-[#E5E4F0]/50 last:border-0 ${
                          selectedCompanion === c.id ? 'bg-[#7C5CFC]/5' : ''
                        }`}
                      >
                        <img
                          src={getAvatarUrl(c.avatar, c.name)}
                          alt={c.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-sm text-[#1E1B4B] truncate">{c.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#7C5CFC]/10 text-[#7C5CFC] font-medium">
                              {getPersonalityLabel(c.personality)}
                            </span>
                            <span className="text-xs text-[#9896BF]">{c.messageCount} msg</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9896BF]" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Conversation view */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E5E4F0] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#E5E4F0]">
                  <h3 className="font-semibold text-[#1E1B4B] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {conversation ? `Conversation avec ${conversation.companion.name}` : 'Conversation'}
                  </h3>
                </div>
                <div className="flex-1 max-h-96 overflow-y-auto scrollbar-thin p-4">
                  {!selectedCompanion ? (
                    <div className="flex items-center justify-center h-full text-[#9896BF] text-sm text-center">
                      <div>
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Sélectionnez un compagnon
                      </div>
                    </div>
                  ) : loading && !conversation ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-[#7C5CFC]" />
                    </div>
                  ) : conversation && conversation.messages.length === 0 ? (
                    <div className="text-center text-[#9896BF] text-sm py-8">Aucun message</div>
                  ) : conversation ? (
                    <div className="space-y-2">
                      {conversation.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                              msg.sender === 'user'
                                ? 'text-white rounded-br-sm'
                                : 'bg-[#F4F5FA] text-[#1E1B4B] rounded-bl-sm border border-[#E5E4F0]'
                            }`}
                            style={msg.sender === 'user' ? { background: 'linear-gradient(135deg, #7C5CFC, #6B4FE0)' } : {}}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-white/60' : 'text-[#9896BF]'}`}>
                              {formatTimeAdmin(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* API Keys tab */}
        {tab === 'keys' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E5E4F0] p-6">
              <h3 className="font-semibold text-[#1E1B4B] mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Statut des clés API
              </h3>
              <div className="space-y-3">
                {['Groq', 'Gemini', 'OpenRouter'].map((name) => {
                  const provider = providers.find((p) => p.name === name);
                  const configured = provider?.configured ?? false;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between p-4 rounded-xl border border-[#E5E4F0] hover:bg-[#F4F5FA]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            configured ? 'bg-green-50' : 'bg-red-50'
                          }`}
                        >
                          <Key className={`w-5 h-5 ${configured ? 'text-green-500' : 'text-red-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[#1E1B4B]">{name}</p>
                          <p className="text-xs text-[#9896BF]">
                            {configured ? 'Clé configurée' : 'Clé non configurée'}
                          </p>
                        </div>
                      </div>
                      {configured ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => loadDiagnostic()}
                disabled={diagnosticLoading}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-[#7C5CFC] border border-[#7C5CFC]/30 hover:bg-[#7C5CFC]/5 transition-colors disabled:opacity-50"
              >
                {diagnosticLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                Rafraîchir
              </button>
            </div>
          </motion.div>
        )}

        {/* Diagnostic tab */}
        {tab === 'diagnostic' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E5E4F0] p-6">
              <h3 className="font-semibold text-[#1E1B4B] mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Diagnostic des connexions API
              </h3>

              {diagnosticLoading && providers.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#7C5CFC]" />
                </div>
              ) : providers.length > 0 ? (
                <div className="space-y-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.name}
                      className={`p-4 rounded-xl border ${
                        provider.configured
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-red-200 bg-red-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {provider.configured ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm text-[#1E1B4B]">{provider.name}</p>
                            <p className="text-xs text-[#9896BF]">
                              {provider.configured ? 'Connecté et prêt' : 'Non configuré'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            provider.configured
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {provider.configured ? 'OK' : 'Erreur'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[#9896BF]">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Cliquez sur le bouton pour lancer le diagnostic</p>
                </div>
              )}

              <button
                onClick={() => loadDiagnostic()}
                disabled={diagnosticLoading}
                className="mt-6 px-6 py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
              >
                {diagnosticLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Activity className="w-5 h-5" />
                )}
                Lancer le diagnostic
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
