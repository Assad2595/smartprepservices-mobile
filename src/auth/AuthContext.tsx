import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api/client';
import {
  AuthCompany,
  AuthSession,
  AuthUser,
  isMobileStaff,
  mapAuthSession,
} from './permissions';

type AuthState = {
  user: AuthUser | null;
  company: AuthCompany;
  roles: string[];
  permissions: string[];
  loading: boolean;
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function applySession(session: AuthSession, setUser: (u: AuthUser) => void, setCompany: (c: AuthCompany) => void) {
  if (!isMobileStaff(session.user)) {
    throw new Error('Mobile app access is limited to internal warehouse staff.');
  }
  setUser(session.user);
  setCompany(session.company);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get('/me');
        const session = mapAuthSession(res.data.data);
        applySession(session, setUser, setCompany);
      } catch {
        await clearToken();
        setUser(null);
        setCompany(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      company,
      roles: user?.roles ?? [],
      permissions: user?.permissions ?? [],
      loading,
      can: (permission: string) => Boolean(user?.permissions?.includes(permission)),
      hasRole: (role: string) => Boolean(user?.roles?.includes(role)),
      async login(email, password) {
        const res = await api.post('/login', { email, password, device_name: 'mobile' });
        const session = mapAuthSession(res.data.data);
        if (!session.token) {
          throw new Error('Login response missing token');
        }
        if (!isMobileStaff(session.user)) {
          throw new Error('Mobile app access is limited to internal warehouse staff.');
        }
        await setToken(session.token);
        setUser(session.user);
        setCompany(session.company);
      },
      async logout() {
        try {
          await api.post('/logout');
        } catch {
          // ignore
        }
        await clearToken();
        setUser(null);
        setCompany(null);
      },
    }),
    [user, company, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
