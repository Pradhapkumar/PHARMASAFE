/**
 * Auth Service — wired to the real FastAPI backend.
 * Falls back to mock data if VITE_USE_MOCK_DATA=true.
 */
import { User, RoleType, AuthResponse } from '../types/api';
import apiClient from './apiClient';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

class AuthService {
  private currentUser: User | null = null;

  async login(email: string, password: string): Promise<AuthResponse> {
    if (USE_MOCK) {
      const { MOCK_USERS } = await import('../mocks/mockData');
      const userKey = email.split('@')[0].toLowerCase();
      const user = MOCK_USERS[userKey] || MOCK_USERS['manufacturer'];
      const mockResponse: AuthResponse = {
        access_token: 'mock_token',
        token_type: 'bearer',
        expires_in: 86400,
        user,
      };
      this.currentUser = user;
      localStorage.setItem('pharmasafe_user', JSON.stringify(user));
      return mockResponse;
    }

    const response = await apiClient.login(email, password);
    this.currentUser = response.user;
    localStorage.setItem('pharmasafe_user', JSON.stringify(response.user));
    return response;
  }

  async getCurrentUser(): Promise<User | null> {
    if (USE_MOCK) {
      if (this.currentUser) return this.currentUser;
      const saved = localStorage.getItem('pharmasafe_user');
      if (saved) {
        this.currentUser = JSON.parse(saved);
        return this.currentUser;
      }
      return null;
    }

    // Ensure valid token or auto-login with current persona
    const token = await apiClient.ensureToken();
    if (token) {
      try {
        const user = await apiClient.getCurrentUser() as User;
        this.currentUser = user;
        localStorage.setItem('pharmasafe_user', JSON.stringify(user));
        return user;
      } catch {
        // Retry logging in fresh
        const saved = this.getStoredUser();
        const roleKey = (saved?.role || 'MANUFACTURER').toLowerCase().replace('_facility', '').replace('_auditor', '');
        return this.switchRole(roleKey);
      }
    }

    const saved = this.getStoredUser();
    if (saved) return saved;
    return this.switchRole('manufacturer');
  }

  getStoredUser(): User | null {
    if (this.currentUser) return this.currentUser;
    const saved = localStorage.getItem('pharmasafe_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        return this.currentUser;
      } catch {
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!(apiClient.getToken() || localStorage.getItem('pharmasafe_user'));
  }

  logout(): void {
    this.currentUser = null;
    apiClient.setToken(null);
    localStorage.removeItem('pharmasafe_user');
    localStorage.removeItem('pharmasafe_token');
    // Legacy mock key cleanup
    localStorage.removeItem('pharmasafe_demo_role');
  }

  isAuthorizedFor(allowedRoles: RoleType[]): boolean {
    const user = this.getStoredUser();
    if (!user) return false;
    return allowedRoles.includes(user.role) || user.role === 'ADMIN';
  }

  /**
   * Evaluator Role Switcher: switch active persona for demo and testing.
   * In live backend mode, logs in as that persona to get genuine RBAC JWT.
   * In mock mode or if backend is offline, falls back to mock user profile.
   */
  async switchRole(roleKey: string): Promise<User | null> {
    const key = roleKey.toLowerCase();
    const { MOCK_USERS } = await import('../mocks/mockData');
    const mockUser = MOCK_USERS[key] || MOCK_USERS['manufacturer'];

    if (!USE_MOCK) {
      try {
        const email = `${key}@pharmasafe.demo`;
        const res = await apiClient.login(email, 'password123');
        this.currentUser = res.user;
        localStorage.setItem('pharmasafe_user', JSON.stringify(res.user));
        return res.user;
      } catch (err) {
        console.warn(`Live API role login failed for ${key}, falling back to mock user session:`, err);
      }
    }

    if (mockUser) {
      this.currentUser = mockUser;
      localStorage.setItem('pharmasafe_user', JSON.stringify(mockUser));
    }
    return this.currentUser;
  }
}

export const authService = new AuthService();
export default authService;
