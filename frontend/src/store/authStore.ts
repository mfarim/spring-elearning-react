import { create } from 'zustand';
import api from '../api/client';
import type { User, AuthResponse, ApiResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  impersonate: (userId: number) => Promise<void>;
  stopImpersonate: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
      const data = response.data.data;

      const user: User = {
        id: data.userId,
        name: data.name,
        email: data.email,
        roles: data.roles,
        active: true,
        impersonatedBy: data.impersonatedBy,
      };

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token: data.accessToken, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  impersonate: async (userId: number) => {
    const response = await api.post<ApiResponse<AuthResponse>>(`/admin/impersonate/${userId}`);
    const data = response.data.data;

    const user: User = {
      id: data.userId,
      name: data.name,
      email: data.email,
      roles: data.roles,
      active: true,
      impersonatedBy: data.impersonatedBy,
    };

    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(user));

    set({ user, token: data.accessToken });
    window.location.href = '/dashboard';
  },

  stopImpersonate: async () => {
    const response = await api.post<ApiResponse<AuthResponse>>('/admin/stop-impersonate');
    const data = response.data.data;

    const user: User = {
      id: data.userId,
      name: data.name,
      email: data.email,
      roles: data.roles,
      active: true,
      impersonatedBy: null,
    };

    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(user));

    set({ user, token: data.accessToken });
    window.location.href = '/dashboard';
  },
}));
