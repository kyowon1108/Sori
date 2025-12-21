'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useIsClient, usePersistHydrated } from '@/hooks/useHydration';
import Loading from './Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  // Use selectors to avoid unnecessary re-renders
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const authLoading = useStore((state) => state.authLoading);

  // Use useSyncExternalStore-based hooks to avoid setState-in-effect
  const isClient = useIsClient();
  const hydrated = usePersistHydrated();

  // Redirect if not authenticated (after hydration)
  useEffect(() => {
    if (isClient && hydrated && !authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isClient, hydrated, isAuthenticated, authLoading, router]);

  // Wait for hydration to complete
  if (!isClient || !hydrated || authLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Loading />;
  }

  return <>{children}</>;
}
