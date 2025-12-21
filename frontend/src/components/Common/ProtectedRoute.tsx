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
  const { isAuthenticated, authLoading } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, authLoading, router]);

  // Wait for hydration to complete
  if (!mounted || authLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Loading />;
  }

  return <>{children}</>;
}
