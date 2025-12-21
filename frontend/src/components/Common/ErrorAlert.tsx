'use client';

import { useStore } from '@/store/useStore';
import { useEffect } from 'react';

export default function ErrorAlert() {
  const { error, setError } = useStore();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
      <span>{error}</span>
      <button
        onClick={() => setError(null)}
        className="ml-2 text-red-700 hover:text-red-900"
      >
        &times;
      </button>
    </div>
  );
}
