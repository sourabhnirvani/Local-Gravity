import { AuthResponse, SessionResponse } from '../types';

export const authService = {
  register(data: { username: string; email: string; password: string }): Promise<AuthResponse> {
    if (!window.auth) {
      return Promise.resolve({ success: false, error: 'Auth bridge is unavailable' });
    }

    return window.auth.register(data);
  },

  login(data: { email: string; password: string }): Promise<AuthResponse> {
    if (!window.auth) {
      return Promise.resolve({ success: false, error: 'Auth bridge is unavailable' });
    }

    return window.auth.login(data);
  },

  logout(): Promise<{ success: boolean }> {
    if (!window.auth) {
      return Promise.resolve({ success: false });
    }

    return window.auth.logout();
  },

  checkSession(): Promise<SessionResponse> {
    if (!window.auth) {
      return Promise.resolve({ success: false });
    }

    return window.auth.checkSession();
  },
};
