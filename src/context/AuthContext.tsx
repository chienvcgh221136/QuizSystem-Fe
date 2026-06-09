import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/services';

interface User {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUser = params.get('user');
    if (urlUser) {
      try {
        const parsed = JSON.parse(decodeURIComponent(urlUser));
        localStorage.setItem('user', JSON.stringify(parsed));
        return parsed;
      } catch (e) {
        console.error("Failed to parse user from URL", e);
      }
    }
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const isEmbed = params.get('embed');
    
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      // Clean up URL but preserve embed if present
      const newUrl = isEmbed ? `${window.location.pathname}?embed=${isEmbed}` : window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      return urlToken;
    }
    return localStorage.getItem('token');
  });

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, login, logout,
      isAdmin: user?.role === 'Admin',
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
