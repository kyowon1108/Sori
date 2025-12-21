import { apiClient } from './api';
import { AuthTokens, User } from '@/types/auth';

export const authService = {
  async register(email: string, password: string, full_name: string): Promise<User> {
    const response = await apiClient.getClient().post('/api/auth/register', {
      email,
      password,
      full_name,
    });
    return response.data.data;
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await apiClient.getClient().post('/api/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.getClient().get('/api/auth/me');
    return response.data.data;
  },

  async updateFCMToken(fcm_token: string, device_type: string): Promise<void> {
    await apiClient.getClient().post('/api/auth/update-fcm-token', {
      fcm_token,
      device_type,
    });
  },
};
