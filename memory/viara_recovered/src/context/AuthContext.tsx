import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/api';
import { User } from '@/types';

interface AuthCtx {
  user: User | null | false;
  setUser: (u: User | null | false) => void;
  logout: () => Promise<void>;
  authOpen: boolean;
  openAuth: (onSuccess?: () => void) => void;
  closeAuth: () => void;
  onAuthSuccess: (() => void) | null;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null | false>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [onAuthSuccess, setOnAuthSuccess] = useState<(() => void) | null>(null);

  useEffect(() => {
    api.get('/auth/me').then((r) => setUser(r.data)).catch(() => setUser(false));
  }, []);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('viara_token');
    setUser(false);
  };

  const openAuth = (onSuccess?: () => void) => {
    setOnAuthSuccess(() => onSuccess || null);
    setAuthOpen(true);
  };

  return (
    <Ctx.Provider value={{ user, setUser, logout, authOpen, openAuth, closeAuth: () => setAuthOpen(false), onAuthSuccess }}>
      {children}
    </Ctx.Provider>
  );
};
