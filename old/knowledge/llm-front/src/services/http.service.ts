// HTTP service with JWT token management
// In dev, use relative URLs to leverage Vite proxy
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://127.0.0.1:3000');

class HttpService {
  private static instance: HttpService;

  private constructor() {}

  static getInstance(): HttpService {
    if (!HttpService.instance) {
      HttpService.instance = new HttpService();
    }
    return HttpService.instance;
  }

  setToken(token: string | null) {
    // Store token in a private property for immediate access
    this.token = token;
    console.log(
      '🔑 [HttpService] Token set:',
      token ? `${token.substring(0, 20)}...` : 'null',
    );
  }

  private token: string | null = null;

  getToken(): string | null {
    // First try the in-memory token
    if (this.token) {
      return this.token;
    }

    // Fallback to localStorage (Zustand persistence)
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token || null;
        if (token) {
          this.token = token; // Cache it for next time
        }
        return token;
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
        return null;
      }
    }
    return null;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_URL}${path}`;

    const headers = new Headers(options.headers);

    // Add content type if not set
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header if token exists
    const token = this.getToken();
    console.log('🔍 [HttpService] Token debug:', {
      path,
      hasMemoryToken: !!this.token,
      memoryTokenLength: this.token?.length,
      localStorageToken: localStorage.getItem('auth-storage')
        ? 'exists'
        : 'missing',
      finalToken: token ? `${token.substring(0, 20)}...` : 'null',
    });

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log('✅ [HttpService] Adding auth header to request');
    } else {
      console.warn('❌ [HttpService] No token available for request:', path);
    }

    console.log('📡 [HttpService] Making request:', {
      url,
      path,
      method: options.method || 'GET',
      hasAuth: !!token,
      headers: Object.fromEntries(headers.entries()),
      ...(options.body && { body: JSON.parse(options.body as string) }),
      stack: new Error().stack, // Add stack trace to see where the request comes from
    });

    try {
      console.log('🚀 [HttpService] About to call fetch...');
      const startTime = Date.now();
      
      // Add timeout to detect hanging requests
      const controller = new AbortController();
      const timeoutDuration = 30000; // 30 seconds
      const timeoutId = setTimeout(() => {
        console.error(`⏱️ [HttpService] Request timeout after ${timeoutDuration/1000}s for ${url}`);
        controller.abort();
      }, timeoutDuration);
      
      const fetchOptions = {
        method: options.method || 'GET',
        headers,
        signal: controller.signal,
        ...(options.body && { body: options.body }),
      };
      
      console.log('🔧 [HttpService] Fetch options:', fetchOptions);
      
      const response = await fetch(url, fetchOptions).catch(err => {
        clearTimeout(timeoutId);
        console.error('🔥 [HttpService] Fetch error:', {
          error: err,
          message: err.message,
          name: err.name,
          url,
          method: options.method || 'GET',
          isAbortError: err.name === 'AbortError',
        });
        
        if (err.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutDuration/1000}s. The server might be down or experiencing high load.`);
        }
        throw new Error(`Network error: ${err.message}. Please check your connection and try again.`);
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.log(`✅ [HttpService] Fetch completed in ${duration}ms, status: ${response.status}`);

      // Handle unauthorized responses
      if (response.status === 401) {
        // Clear token and redirect to login
        this.setToken(null);
        // Only redirect if not already on auth pages
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      // Handle empty responses
      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
    } catch (error) {
      console.error('HTTP Request failed:', error);
      throw error;
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const httpService = HttpService.getInstance();
