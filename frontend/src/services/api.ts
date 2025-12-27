import axios, { AxiosInstance, AxiosError } from 'axios';
import { useStore } from '@/store/useStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

class APIClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        const store = useStore.getState();
        if (store.accessToken) {
          config.headers.Authorization = `Bearer ${store.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터 (토큰 갱신)
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as typeof error.config & { _retry?: boolean };

        // 401 에러이고 이미 재시도하지 않은 경우
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // 토큰 갱신 중이 아니면 시작
            if (!this.isRefreshing) {
              this.isRefreshing = true;
              const store = useStore.getState();

              if (store.refreshToken) {
                this.refreshPromise = this.refreshToken(store.refreshToken);
                const newToken = await this.refreshPromise;
                this.isRefreshing = false;
                this.refreshPromise = null;

                // 새 토큰으로 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            } else if (this.refreshPromise) {
              // 이미 갱신 중이면 그 결과 기다리기
              const newToken = await this.refreshPromise;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // 토큰 갱신 실패 → 로그인 페이지로
            useStore.getState().logout();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await this.client.post('/api/auth/refresh', {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token } = response.data.data || response.data;
      useStore.getState().setTokens(access_token, refresh_token);

      return access_token;
    } catch (error) {
      useStore.getState().logout();
      throw error;
    }
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new APIClient();
