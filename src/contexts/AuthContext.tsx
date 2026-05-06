import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole =
  | 'admin'
  | 'chef_projet'
  | 'storage'
  | 'purchase'
  | 'gestionnaire'
  | 'technique'
  | 'comptable'
  | 'resp_projets';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  supabaseAuthFailed: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  signup: (fullName: string, username: string, email: string, password: string) => Promise<boolean>;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users used as fallback when Supabase is unavailable
const mockUsers: Record<UserRole, User> = {
  admin:        { id: '550e8400-e29b-41d4-a716-446655440001', fullName: 'أحمد محمد',    username: 'admin',        email: 'admin@erp.com',    role: 'admin' },
  chef_projet:  { id: '550e8400-e29b-41d4-a716-446655440002', fullName: 'خالد عبدالله', username: 'chef',         email: 'chef@erp.com',     role: 'chef_projet' },
  storage:      { id: '550e8400-e29b-41d4-a716-446655440003', fullName: 'سعيد حسن',     username: 'storage',      email: 'storage@erp.com',  role: 'storage' },
  purchase:     { id: '550e8400-e29b-41d4-a716-446655440004', fullName: 'عمر يوسف',     username: 'purchase',     email: 'purchase@erp.com', role: 'purchase' },
  gestionnaire: { id: '550e8400-e29b-41d4-a716-446655440005', fullName: 'محمد علي',     username: 'gestionnaire', email: 'gest@erp.com',     role: 'gestionnaire' },
  technique:    { id: '550e8400-e29b-41d4-a716-446655440006', fullName: 'ياسر كريم',    username: 'technique',    email: 'tech@erp.com',     role: 'technique' },
  comptable:    { id: '550e8400-e29b-41d4-a716-446655440007', fullName: 'فاطمة زهرة',   username: 'comptable',    email: 'comptable@comptable.com', role: 'comptable' },
  resp_projets: { id: '550e8400-e29b-41d4-a716-446655440008', fullName: 'نور الدين',    username: 'resp',         email: 'resp@erp.com',     role: 'resp_projets' },
};

// Single source of truth for all demo credentials.
// LoginPage.quickAccessCredentials MUST match these exactly.
export const ROLE_CREDENTIALS: Record<string, { email: string; password: string; role: UserRole; label: string }> = {
  admin:        { email: 'admin@admin.com',        password: 'admin123',      role: 'admin',        label: 'Admin' },
  chef_projet:  { email: 'chef@projet.com',         password: 'chef123',       role: 'chef_projet',  label: 'Chef Projet' },
  storage:      { email: 'stockage@stockage.com',   password: 'stockage123',   role: 'storage',      label: 'Stockage' },
  purchase:     { email: 'achats@achats.com',        password: 'achats123',     role: 'purchase',     label: 'Achats' },
  gestionnaire: { email: 'gest@erp.com',            password: 'gest123',       role: 'gestionnaire', label: 'Gestionnaire' },
  technique:    { email: 'tech@erp.com',            password: 'tech123',       role: 'technique',    label: 'Technique' },
  comptable:    { email: 'comptable@comptable.com', password: 'comptable123',  role: 'comptable',    label: 'Comptable' },
  resp_projets: { email: 'resp@erp.com',            password: 'resp123',       role: 'resp_projets', label: 'Resp Projets' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseAuthFailed, setSupabaseAuthFailed] = useState(false);

  // ─── LOAD SESSION FROM STORAGE ON MOUNT ────────────────────────────────────
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (e) {
        console.warn('[Auth] Failed to parse saved user:', e);
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  // ─── SIGNUP ────────────────────────────────────────────────────────────────
  const signup = async (
    fullName: string,
    username: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { fullName, username, role: 'admin' },
        },
      });

      const newUser: User = {
        id: error ? `local-${Date.now()}` : (data.user?.id ?? `local-${Date.now()}`),
        fullName,
        username,
        email,
        role: 'admin',
      };
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      return true;
    } catch {
      // Offline / Supabase down — allow local signup anyway
      const newUser = { id: `local-${Date.now()}`, fullName, username, email, role: 'admin' as UserRole };
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      return true;
    }
  };

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {

    // ── Step 1: Match against ROLE_CREDENTIALS (used by quick-login buttons)
    // This is purely local — no network call at all.
    const credEntry = Object.values(ROLE_CREDENTIALS).find(
      (c) => c.email === emailOrUsername && c.password === password,
    );
    if (credEntry) {
      const user = mockUsers[credEntry.role];
      setUser(user);
      localStorage.setItem('auth_user', JSON.stringify(user));
      return true;
    }

    // ── Step 2: Match by username (manual login typed in the form)
    // Checks the mock user list so "admin" / "chef" etc. still work offline.
    const allDemoPasswords = Object.values(ROLE_CREDENTIALS).map((c) => c.password);
    const mockByUsername = Object.values(mockUsers).find(
      (u) => u.username === emailOrUsername || u.email === emailOrUsername,
    );
    if (mockByUsername && allDemoPasswords.includes(password)) {
      setUser(mockByUsername);
      localStorage.setItem('auth_user', JSON.stringify(mockByUsername));
      return true;
    }

    // ── Step 3: Real Supabase authentication
    // Reached only when the credentials don't match any demo account.
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });

      // 5xx → Supabase server problem (what you were hitting)
      if (error && (error.status ?? 0) >= 500) {
        setSupabaseAuthFailed(true);
        return false;
      }

      // 4xx → wrong credentials, not a server problem
      if (error) {
        setSupabaseAuthFailed(false);
        return false;
      }

      if (data.user) {
        setSupabaseAuthFailed(false);

        // Pull role from public.users first (most reliable), fall back to metadata
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, username, role')
          .eq('id', data.user.id)
          .single();

        const meta = data.user.user_metadata;
        const newUser = {
          id: data.user.id,
          fullName: profile?.full_name ?? meta?.fullName ?? data.user.email ?? '',
          username:  profile?.username  ?? meta?.username  ?? (data.user.email?.split('@')[0] ?? ''),
          email:     data.user.email    ?? emailOrUsername,
          role:      (profile?.role     ?? meta?.role      ?? 'admin') as UserRole,
        };
        setUser(newUser);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        return true;
      }
    } catch (err: unknown) {
      // Network error or unexpected throw — mark Supabase as unavailable
      console.warn('[Auth] Supabase unreachable:', err);
      setSupabaseAuthFailed(true);
      return false;
    }

    return false;
  };

  // ─── HELPERS ───────────────────────────────────────────────────────────────
  const loginAsRole = (role: UserRole) => {
    const user = mockUsers[role];
    setUser(user);
    localStorage.setItem('auth_user', JSON.stringify(user));
  };
  const logout      = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };
  const updateUser  = (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      localStorage.setItem('auth_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, supabaseAuthFailed, login, signup, loginAsRole, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};