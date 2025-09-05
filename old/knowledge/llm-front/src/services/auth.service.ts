import { httpService } from './http.service';
import type { LoginDto, RegisterDto, AuthResponse, User } from '../types/auth';
import { useAuthStore } from '../stores/auth.store';
import { extractUserFromJwt } from '../utils/jwt';

class AuthService {
  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      console.log('🔐 [AuthService] Attempting login for:', dto.email);
      
      // Use httpService to leverage Vite proxy
      const response = await httpService.post<AuthResponse>('/auth/login', dto);

      console.log('✅ [AuthService] Login response received:', {
        hasToken: !!response.access_token,
        tokenLength: response.access_token?.length,
        user: response.user,
      });

      // Store token and user in auth store
      const { setToken, setUser } = useAuthStore.getState();
      setToken(response.access_token);
      setUser(response.user);
      
      // Also set token in httpService for future requests
      httpService.setToken(response.access_token);

      // Verify token was stored
      const storedToken = httpService.getToken();
      console.log('🔍 [AuthService] Token stored in httpService:', {
        hasToken: !!storedToken,
        tokenLength: storedToken?.length,
        tokenPrefix: storedToken?.substring(0, 20) + '...',
      });

      return response;
    } catch (error) {
      console.error('❌ [AuthService] Login error:', error);
      throw error;
    }
  }

  async register(dto: RegisterDto): Promise<User> {
    try {
      const response = await httpService.post<User>('/auth/register', dto);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await httpService.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local auth state regardless
      const { logout } = useAuthStore.getState();
      logout();
    }
  }

  getUserFromToken(): User | null {
    const token = httpService.getToken();
    if (!token) return null;
    return extractUserFromJwt(token);
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await httpService.get<{ authenticated: boolean }>(
        '/auth/check',
      );
      return response.authenticated;
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();
