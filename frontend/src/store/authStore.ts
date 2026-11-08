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

// Only the short-lived access token and the profile are kept in localStorage.
// The refresh token is set by the backend as an httpOnly cookie and never touches JavaScript.
const persistSession = (data: AuthResponse, user: User) => {
  localStorage.setItem('token', data.accessToken);
  localStorage.setItem('user', JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Older builds stored the refresh token in localStorage; remove it so it cannot be stolen.
const removeLegacyRefreshToken = () => localStorage.removeItem('refreshToken');

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: () => {
    removeLegacyRefreshToken();
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        clearSession();
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
    // Revoke the refresh token server-side and clear its cookie (best effort), then drop the local session.
    // The httpOnly cookie is sent automatically; keepalive lets the request finish while we navigate away.
    fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => undefined);
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
