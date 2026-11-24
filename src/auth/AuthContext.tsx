import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, clearToken, getToken, refreshSession, setToken, setUnauthorizedHandler } from '../api/client';
import { AuthCompany, AuthSession, AuthUser, mapAuthSession } from './permissions';

// Opening the app starts a new 5-day session (the token is swapped for a fresh
// one). Coming back to an app that was only in the background does the same,
// but not more than once a minute.
const RESUME_REFRESH_MS = 60_000;
const SESSION_ENDED = 'Your session has ended. Please sign in again.';

type AuthState = {
  user: AuthUser | null;
  company: AuthCompany;
  roles: string[];
  permissions: string[];
  loading: boolean;
  /** Why the user is looking at the login screen (session ended, server unreachable), if there is a reason. */
  notice: string | null;
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function applySession(session: AuthSession, setUser: (u: AuthUser) => void, setCompany: (c: AuthCompany) => void) {
  setUser(session.user);
  setCompany(session.company);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const lastRefresh = useRef(0);
  const signedIn = useRef(false);

  const signOut = useCallback(async (message?: string) => {
    signedIn.current = false;
    await clearToken();
    setUser(null);
    setCompany(null);
    if (message) setNotice(message);
  }, []);

  /** A new session: fresh token, and the user's permissions as they are now. */
  const startSession = useCallback(async () => {
    const session = mapAuthSession(await refreshSession());
    lastRefresh.current = Date.now();
    applySession(session, setUser, setCompany);
  }, []);

  // The server refusing the token anywhere in the app (not renewed for 5 days,
  // revoked, user switched off) signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (signedIn.current) void signOut(SESSION_ENDED);
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Launch: a stored token starts a new session straight away.
  useEffect(() => {
    (async () => {
      try {
        if (!(await getToken())) return;
        signedIn.current = true;
        await startSession();
      } catch (e: any) {
        // A 401 has already signed the user out. Anything else (no signal) keeps
        // the token for the next launch rather than throwing a valid login away.
        if (e?.response?.status !== 401) {
          signedIn.current = false;
          setNotice('Could not reach the server. Check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [startSession]);

  // Back to the app after it was in the background: renew the session.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !signedIn.current) return;
      if (Date.now() - lastRefresh.current < RESUME_REFRESH_MS) return;
      startSession().catch(() => undefined); // 401 -> handler above; offline -> carry on
    });
    return () => subscription.remove();
  }, [startSession]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      company,
      roles: user?.roles ?? [],
      permissions: user?.permissions ?? [],
      loading,
      notice,
      can: (permission: string) => Boolean(user?.permissions?.includes(permission)),
      hasRole: (role: string) => Boolean(user?.roles?.includes(role)),
      async login(email, password) {
        const res = await api.post('/login', { email, password, device_name: 'mobile' });
        const session = mapAuthSession(res.data.data);
        if (!session.token) {
          throw new Error('Login response missing token');
        }
        await setToken(session.token);
        signedIn.current = true;
        lastRefresh.current = Date.now();
        setNotice(null);
        setUser(session.user);
        setCompany(session.company);
      },
      async logout() {
        try {
          await api.post('/logout');
        } catch {
          // ignore
        }
        await signOut();
      },
    }),
    [user, company, loading, notice, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
