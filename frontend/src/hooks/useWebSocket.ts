'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { wsService } from '@/services/websocket';

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
      if (message.type === 'message') {
        addChatMessage({
          role: message.role || 'assistant',
          content: message.content,
          is_streaming: message.is_streaming || false,
        });
      } else if (message.type === 'error') {
        setError(message.message || 'Unknown WebSocket error');
      } else if (message.type === 'call_ended') {
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
