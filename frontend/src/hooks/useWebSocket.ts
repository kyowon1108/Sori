'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';

export const useWebSocket = (callId: number | null) => {
  const wsRef = useRef<WebSocket | null>(null);

  // Select specific state values and actions
  const accessToken = useStore((state) => state.accessToken);
  const addChatMessage = useStore((state) => state.addChatMessage);
  const setError = useStore((state) => state.setError);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!callId || !accessToken) return;

    const wsUrl = new URL(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000');
    wsUrl.pathname = `/ws/${callId}`;
    wsUrl.searchParams.append('token', accessToken);

    try {
      wsRef.current = new WebSocket(wsUrl.toString());

      wsRef.current.onopen = () => {
        console.log('[WebSocket] Connected');
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'message') {
          addChatMessage({
            role: message.role,
            content: message.content,
            is_streaming: message.is_streaming || false,
          });
        } else if (message.type === 'call_ended') {
          disconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setError('WebSocket 연결 오류');
      };

      wsRef.current.onclose = () => {
        console.log('[WebSocket] Disconnected');
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      setError('WebSocket 연결 실패');
    }
  }, [callId, accessToken, addChatMessage, setError, disconnect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          content,
        })
      );
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { sendMessage, disconnect };
};
