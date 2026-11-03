import { create } from 'zustand';
import api from '../api/client';
import type { User, AuthResponse, ApiResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  impersonate: (userId: number) => Promise<void>;
  stopImpersonate: () => Promise<void>;
  initAuth: () => void;
}

const toUser = (data: AuthResponse): User => ({
  id: data.userId,
  name: data.name,
  email: data.email,
  roles: data.roles,
  active: true,
  impersonatedBy: data.impersonatedBy ?? data.impersonatorAdminId ?? null,
  mustChangePassword: !!data.mustChangePassword,
});

const persistSession = (data: AuthResponse, user: User) => {
  localStorage.setItem('token', data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }
  localStorage.setItem('user', JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

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
        localStorage.removeItem('refreshToken');
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
      const user = toUser(data);
      persistSession(data, user);
      set({ user, token: data.accessToken, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    // Revoke the refresh token server-side (best effort), then drop the local session.
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      // keepalive lets the request finish even though we navigate away right after.
      fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        keepalive: true,
      }).catch(() => undefined);
    }
    clearSession();
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    const data = response.data.data;
    const user = toUser(data);
    persistSession(data, user);
    set({ user, token: data.accessToken, isAuthenticated: true });
  },

  impersonate: async (userId: number) => {
    const response = await api.post<ApiResponse<AuthResponse>>(`/admin/impersonate/${userId}`);
    const data = response.data.data;

    const user = toUser(data);
    persistSession(data, user);

    set({ user, token: data.accessToken });
    window.location.href = '/dashboard';
  },

  stopImpersonate: async () => {
    const response = await api.post<ApiResponse<AuthResponse>>('/admin/stop-impersonate');
    const data = response.data.data;

    const user = toUser(data);
    persistSession(data, user);

    set({ user, token: data.accessToken });
    window.location.href = '/dashboard';
  },
}));
