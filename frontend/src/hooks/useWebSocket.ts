'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { wsService } from '@/services/websocket';

// Type guard helpers for narrowing unknown fields
function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export const useWebSocket = (callId: number | null) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const addChatMessage = useStore((state) => state.addChatMessage);
  const setError = useStore((state) => state.setError);

  useEffect(() => {
    if (!callId) return;

    // Connect to the service
    wsService.connect(callId);

    // Subscribe to status changes
    const unsubscribeStatus = wsService.addStatusListener((newStatus) => {
      setStatus(newStatus);
    });

    // Subscribe to incoming messages
    const unsubscribeMessages = wsService.addMessageListener((message) => {
      const type = asString(message.type);

      if (type === 'message') {
        const role = asString(message.role, 'assistant');
        const content = asString(message.content, '');
        const is_streaming = asBool(message.is_streaming, false);

        if (!content.trim()) return;

        addChatMessage({
          role,
          content,
          is_streaming,
        });
      } else if (type === 'error') {
        setError(asString(message.message, 'Unknown WebSocket error'));
      } else if (type === 'call_ended') {
        wsService.disconnect();
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessages();
      wsService.disconnect();
    };
  }, [callId, addChatMessage, setError]);

  const sendMessage = useCallback((content: string) => {
    wsService.send({
      type: 'message',
      content,
    });
  }, []);

  const disconnect = useCallback(() => {
    wsService.disconnect();
  }, []);

  return {
    sendMessage,
    disconnect,
    status
  };
};
