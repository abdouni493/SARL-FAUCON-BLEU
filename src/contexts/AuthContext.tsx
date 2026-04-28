import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'chef_projet' | 'storage' | 'purchase' | 'gestionnaire' | 'technique' | 'comptable' | 'resp_projets';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  signup: (fullName: string, username: string, email: string, password: string) => Promise<boolean>;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mockUsers: Record<UserRole, User> = {
  admin: { id: '550e8400-e29b-41d4-a716-446655440001', fullName: 'أحمد محمد', username: 'admin', email: 'admin@erp.com', role: 'admin' },
  chef_projet: { id: '550e8400-e29b-41d4-a716-446655440002', fullName: 'خالد عبدالله', username: 'chef', email: 'chef@erp.com', role: 'chef_projet' },
  storage: { id: '550e8400-e29b-41d4-a716-446655440003', fullName: 'سعيد حسن', username: 'storage', email: 'storage@erp.com', role: 'storage' },
  purchase: { id: '550e8400-e29b-41d4-a716-446655440004', fullName: 'عمر يوسف', username: 'purchase', email: 'purchase@erp.com', role: 'purchase' },
  gestionnaire: { id: '550e8400-e29b-41d4-a716-446655440005', fullName: 'محمد علي', username: 'gestionnaire', email: 'gest@erp.com', role: 'gestionnaire' },
  technique: { id: '550e8400-e29b-41d4-a716-446655440006', fullName: 'ياسر كريم', username: 'technique', email: 'tech@erp.com', role: 'technique' },
  comptable: { id: '550e8400-e29b-41d4-a716-446655440007', fullName: 'فاطمة زهرة', username: 'comptable', email: 'compt@erp.com', role: 'comptable' },
  resp_projets: { id: '550e8400-e29b-41d4-a716-446655440008', fullName: 'نور الدين', username: 'resp', email: 'resp@erp.com', role: 'resp_projets' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signup = async (fullName: string, username: string, email: string, password: string): Promise<boolean> => {
    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Signup error:', error);
        return false;
      }

      // Create user object with admin role
      const newUser: User = {
        id: data.user?.id || '',
        fullName,
        username,
        email,
        role: 'admin'
      };

      setUser(newUser);
      return true;
    } catch (error) {
      console.error('Signup exception:', error);
      return false;
    }
  };

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      // Try login with Supabase first (real authentication)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });

      if (!error && data.user?.id) {
        // User logged in successfully with Supabase
        const userMetadata = data.user.user_metadata;
        const newUser: User = {
          id: data.user.id,
          fullName: userMetadata?.fullName || emailOrUsername,
          username: userMetadata?.username || emailOrUsername,
          email: data.user.email || emailOrUsername,
          role: (userMetadata?.role || 'admin') as UserRole,
        };
        setUser(newUser);
        console.log('Logged in with Supabase:', newUser.fullName);
        return true;
      }

      // Fallback to mock users if Supabase fails
      console.log('Supabase login failed, trying mock users...');
      const mockUser = Object.values(mockUsers).find(
        u => u.username === emailOrUsername || u.email === emailOrUsername
      );

      if (mockUser && (password === 'demo' || password === 'admin123' || password === 'chef123' || password === 'stockage123' || password === 'comptable123' || password === 'achats123')) {
        setUser(mockUser);
        console.log('Logged in with mock user:', mockUser.fullName);
        return true;
      }

      console.error('Login failed - invalid credentials');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to mock user
      const mockUser = Object.values(mockUsers).find(
        u => u.username === emailOrUsername || u.email === emailOrUsername
      );

      if (mockUser) {
        setUser(mockUser);
        return true;
      }

      return false;
    }
  };

  const loginAsRole = (role: UserRole) => {
    // Mock login for demo purposes
    const mockUsers: Record<UserRole, User> = {
      admin: { id: '1', fullName: 'أحمد محمد', username: 'admin', email: 'admin@erp.com', role: 'admin' },
      chef_projet: { id: '2', fullName: 'خالد عبدالله', username: 'chef', email: 'chef@erp.com', role: 'chef_projet' },
      storage: { id: '3', fullName: 'سعيد حسن', username: 'storage', email: 'storage@erp.com', role: 'storage' },
      purchase: { id: '4', fullName: 'عمر يوسف', username: 'purchase', email: 'purchase@erp.com', role: 'purchase' },
      gestionnaire: { id: '5', fullName: 'محمد علي', username: 'gestionnaire', email: 'gest@erp.com', role: 'gestionnaire' },
      technique: { id: '6', fullName: 'ياسر كريم', username: 'technique', email: 'tech@erp.com', role: 'technique' },
      comptable: { id: '7', fullName: 'فاطمة زهرة', username: 'comptable', email: 'compt@erp.com', role: 'comptable' },
      resp_projets: { id: '8', fullName: 'نور الدين', username: 'resp', email: 'resp@erp.com', role: 'resp_projets' },
    };
    setUser(mockUsers[role]);
  };

  const logout = () => setUser(null);
  const updateUser = (data: Partial<User>) => {
    if (user) setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, loginAsRole, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
