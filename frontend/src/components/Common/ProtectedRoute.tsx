'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Loading from './Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  // Use selectors to avoid unnecessary re-renders
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const authLoading = useStore((state) => state.authLoading);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait for Zustand persist to hydrate
  useEffect(() => {
    // Small delay to ensure persist middleware has hydrated
    const timer = setTimeout(() => {
      setHydrated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Redirect if not authenticated (after hydration)
  useEffect(() => {
    if (mounted && hydrated && !authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, hydrated, isAuthenticated, authLoading, router]);

  // Wait for hydration to complete
  if (!mounted || !hydrated || authLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Loading />;
  }

  return <>{children}</>;
}
