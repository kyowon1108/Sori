export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  fcm_token?: string;
  device_type?: string;
  push_enabled: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
