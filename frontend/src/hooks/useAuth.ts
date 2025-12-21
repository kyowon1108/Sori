'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { authService } from '@/services/auth';

export const useAuth = () => {
  const router = useRouter();

  // Select specific state values to avoid unnecessary re-renders
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const authLoading = useStore((state) => state.authLoading);
  const error = useStore((state) => state.error);

  // Select actions separately - these are stable references
  const setUser = useStore((state) => state.setUser);
  const setTokens = useStore((state) => state.setTokens);
  const setAuthLoading = useStore((state) => state.setAuthLoading);
  const setError = useStore((state) => state.setError);
  const storeLogout = useStore((state) => state.logout);

  const register = useCallback(
    async (email: string, password: string, full_name: string) => {
      try {
        setAuthLoading(true);
        await authService.register(email, password, full_name);
        // 회원가입 성공 후 로그인 페이지로
        router.push('/login');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || '회원가입 실패');
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthLoading, setError, router]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setAuthLoading(true);
        const response = await authService.login(email, password);
        setTokens(response.access_token, response.refresh_token);
        setUser(response.user);
        // Set cookie for middleware authentication
        document.cookie = `accessToken=${response.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        router.push('/dashboard');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || '로그인 실패');
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthLoading, setTokens, setUser, setError, router]
  );

  const logout = useCallback(() => {
    storeLogout();
    // Clear cookie
    document.cookie = 'accessToken=; path=/; max-age=0';
    router.push('/login');
  }, [storeLogout, router]);

  return {
    user,
    isAuthenticated,
    authLoading,
    error,
    register,
    login,
    logout,
  };
};
