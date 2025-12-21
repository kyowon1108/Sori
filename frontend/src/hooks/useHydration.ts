import { useSyncExternalStore } from 'react';
import { useStore } from '@/store/useStore';

// Empty function for subscribe (no-op since client state doesn't change)
const emptySubscribe = () => () => {};

/**
 * Returns true only on client-side, false during SSR.
 * Uses useSyncExternalStore to avoid setState-in-effect lint error.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // Client snapshot
    () => false   // Server snapshot
  );
}

/**
 * Returns true when Zustand persist has finished hydrating from storage.
 * Uses useSyncExternalStore to avoid setState-in-effect lint error.
 */
export function usePersistHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => useStore.persist.onFinishHydration(callback),
    () => useStore.persist.hasHydrated(),
    () => false   // Server snapshot - not hydrated
  );
}
