'use client';

import { useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { callsService } from '@/services/calls';

export const useCalls = () => {
  // Select specific state values to avoid unnecessary re-renders
  const callsList = useStore((state) => state.callsList);
  const currentCall = useStore((state) => state.currentCall);
  const callsLoading = useStore((state) => state.callsLoading);
  const chatMessages = useStore((state) => state.chatMessages);
  const error = useStore((state) => state.error);

  // Select actions separately - these are stable references
  const setCallsList = useStore((state) => state.setCallsList);
  const setCurrentCall = useStore((state) => state.setCurrentCall);
  const setCallsLoading = useStore((state) => state.setCallsLoading);
  const clearChatMessages = useStore((state) => state.clearChatMessages);
  const setError = useStore((state) => state.setError);

  const fetchList = useCallback(async (elderlyId?: number) => {
    try {
      setCallsLoading(true);
      const list = await callsService.getList(elderlyId);
      setCallsList(list);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || '통화 목록 조회 실패');
    } finally {
      setCallsLoading(false);
    }
  }, [setCallsLoading, setCallsList, setError]);

  const fetchById = useCallback(async (id: number) => {
    try {
      setCallsLoading(true);
      const call = await callsService.getById(id);
      setCurrentCall(call);
      return call;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || '통화 정보 조회 실패');
      throw error;
    } finally {
      setCallsLoading(false);
    }
  }, [setCallsLoading, setCurrentCall, setError]);

  const startCall = useCallback(
    async (elderlyId: number, callType: string = 'voice') => {
      try {
        setCallsLoading(true);
        clearChatMessages();
        const call = await callsService.startCall(elderlyId, callType);
        setCurrentCall(call);
        return call;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || '통화 시작 실패');
        throw error;
      } finally {
        setCallsLoading(false);
      }
    },
    [setCallsLoading, clearChatMessages, setCurrentCall, setError]
  );

  const endCall = useCallback(
    async (id: number) => {
      try {
        setCallsLoading(true);
        const call = await callsService.endCall(id);
        setCurrentCall(call);
        return call;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || '통화 종료 실패');
        throw error;
      } finally {
        setCallsLoading(false);
      }
    },
    [setCallsLoading, setCurrentCall, setError]
  );

  return {
    callsList,
    currentCall,
    callsLoading,
    chatMessages,
    error,
    fetchList,
    fetchById,
    startCall,
    endCall,
  };
};
