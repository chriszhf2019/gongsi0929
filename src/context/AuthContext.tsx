import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  authModalInitialTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    name: string,
    email: string,
    password: string,
    org?: string,
    role?: string
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  incrementStat: (statKey: keyof UserProfile['stats']) => void;
  recordSearch: () => void;
  recordExport: () => void;
}

const STORAGE_KEY = 'panorama_auth_user_v1';

/**
 * 服务端返回的会话用户信息。
 */
interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
  organization: string | null;
  tier: 'Free' | 'Pro' | 'Enterprise';
  createdAt: number;
}

function toUserProfile(serverUser: ServerUser, analyzedCount: number): UserProfile {
  return {
    id: serverUser.id,
    name: serverUser.name,
    email: serverUser.email,
    role: serverUser.role || '产业研究员',
    organization: serverUser.organization || undefined,
    tier: serverUser.tier,
    createdAt: new Date(serverUser.createdAt).toISOString().split('T')[0],
    stats: {
      analyzedCompaniesCount: analyzedCount,
      watchlistCount: 0,
      exportedReportsCount: 0,
      savedCustomNodesCount: 0,
    },
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 初始为 null：登录态由服务端 Cookie 会话决定，页面加载时恢复
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');

  // 启动时从服务端恢复会话（HttpOnly Cookie 携带 session token）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data && data.user) {
          const analyzedCount = data.stats?.analyzedCompaniesCount || 0;
          const profile = toUserProfile(data.user, analyzedCount);
          // watchlist 等纯前端统计从本地恢复，登录统计以服务端为准
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const localStats = JSON.parse(saved)?.stats;
              if (localStats) {
                profile.stats.watchlistCount = localStats.watchlistCount || 0;
                profile.stats.exportedReportsCount = localStats.exportedReportsCount || 0;
                profile.stats.savedCustomNodesCount = localStats.savedCustomNodesCount || 0;
              }
            }
          } catch {
            // ignore
          }
          setUser(profile);
        }
      } catch {
        // 网络异常时保持未登录态
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 本地仅持久化前端展示性统计；身份与 tier 均以服务端会话为准
  useEffect(() => {
    if (user) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: user.id, email: user.email, stats: user.stats })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);
  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || `登录失败 (${res.status})` };
      }
      setUser(toUserProfile(data.user, data.stats?.analyzedCompaniesCount || 0));
      setIsAuthModalOpen(false);
      return { ok: true };
    } catch {
      return { ok: false, error: '网络异常，请稍后再试' };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    org?: string,
    role?: string
  ): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, email, password, organization: org, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || `注册失败 (${res.status})` };
      }
      setUser(toUserProfile(data.user, 0));
      setIsAuthModalOpen(false);
      return { ok: true };
    } catch {
      return { ok: false, error: '网络异常，请稍后再试' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // ignore
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setIsProfileModalOpen(false);
  };

  const incrementStat = (statKey: keyof UserProfile['stats']) => {
    if (!user) return;
    setUser({
      ...user,
      stats: {
        ...user.stats,
        [statKey]: (user.stats[statKey] || 0) + 1,
      },
    });
  };

  const recordSearch = () => incrementStat('analyzedCompaniesCount');
  const recordExport = () => incrementStat('exportedReportsCount');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthModalOpen,
        isProfileModalOpen,
        authModalInitialTab,
        openAuthModal,
        closeAuthModal,
        openProfileModal,
        closeProfileModal,
        login,
        register,
        logout,
        incrementStat,
        recordSearch,
        recordExport,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
