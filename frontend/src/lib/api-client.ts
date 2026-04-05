import type { ApiError } from '@/types/api';
import { formatApiErrorMessage } from '@/lib/format-api-message';
import { fetchBffRefresh } from '@/lib/bff-refresh';
import { getBffSessionSnapshot } from '@/lib/bff-session';

const DIRECT_BASE =
  (typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    : ''
  ).replace(/\/$/, '');

const BFF_BASE = '/api/proxy';

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  _retry?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = typeof window === 'undefined' ? DIRECT_BASE : BFF_BASE;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          statusCode: response.status,
          message: response.statusText || 'An error occurred',
        };
      }

      let message = formatApiErrorMessage(errorData.message);
      if (response.status === 429) {
        message =
          'Too many requests. Please wait a moment and try again.';
      }

      throw new ApiClientError(
        response.status,
        message,
        errorData.errors
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      requiresAuth = true,
      headers = {},
      _retry,
      ...fetchOptions
    } = options;

    const isBrowser = typeof window !== 'undefined';

    const config: RequestInit = {
      ...fetchOptions,
      credentials: isBrowser ? 'include' : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const url = `${this.baseURL}${endpoint}`;

    try {
      let response = await fetch(url, config);

      // Right after login, the browser may not attach fresh HttpOnly cookies to the very next
      // same-tab fetch. Retry /users/me once before refresh/logout to avoid a false "session expired".
      if (
        response.status === 401 &&
        requiresAuth &&
        isBrowser &&
        !_retry &&
        endpoint === '/users/me'
      ) {
        await new Promise((r) => setTimeout(r, 400));
        response = await fetch(url, config);
      }

      if (
        response.status === 401 &&
        requiresAuth &&
        isBrowser &&
        !_retry
      ) {
        const snap = await getBffSessionSnapshot();
        if (snap.hasRefreshCookie) {
          const refreshed = await fetchBffRefresh();
          if (refreshed.ok) {
            return this.request<T>(endpoint, { ...options, _retry: true });
          }
        }
      }

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        // Let AuthContext (or callers) clear cookies + navigate — avoids double logout
        // and full-page reload racing client-side session recovery after refresh.
        throw error;
      }
      const isNetworkError =
        error instanceof TypeError &&
        (error.message === 'Failed to fetch' ||
          error.message.includes('NetworkError'));
      throw new ApiClientError(
        0,
        isNetworkError
          ? 'Unable to connect to the server. Please check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'Network error occurred'
      );
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /** @deprecated Tokens are HttpOnly; kept for call sites that still invoke it. */
  setToken(token: string): void {
    void token;
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    void fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Do not remove `auth-storage` here — that key is owned by zustand-persist; deleting it
    // mid-reload races rehydration and caused false logouts. Call `storeLogout()` to clear it.
  }
}

export const apiClient = new ApiClient();
