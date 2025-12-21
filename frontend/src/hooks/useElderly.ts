'use client';

import { useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { elderlyService } from '@/services/elderly';
import { ElderlyCreateRequest } from '@/types/elderly';

export const useElderly = () => {
  // Select specific state values to avoid unnecessary re-renders
  const elderlyList = useStore((state) => state.elderlyList);
  const currentElderly = useStore((state) => state.currentElderly);
  const elderlyLoading = useStore((state) => state.elderlyLoading);
  const error = useStore((state) => state.error);

  // Select actions separately - these are stable references
  const setElderlyList = useStore((state) => state.setElderlyList);
  const setCurrentElderly = useStore((state) => state.setCurrentElderly);
  const setElderlyLoading = useStore((state) => state.setElderlyLoading);
  const setError = useStore((state) => state.setError);

  const fetchList = useCallback(async () => {
    try {
      setElderlyLoading(true);
      const list = await elderlyService.getList();
      setElderlyList(list);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || '어르신 목록 조회 실패');
    } finally {
      setElderlyLoading(false);
    }
  }, [setElderlyLoading, setElderlyList, setError]);

  const fetchById = useCallback(async (id: number) => {
    try {
      setElderlyLoading(true);
      const elderly = await elderlyService.getById(id);
      setCurrentElderly(elderly);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || '어르신 정보 조회 실패');
    } finally {
      setElderlyLoading(false);
    }
  }, [setElderlyLoading, setCurrentElderly, setError]);

  const create = useCallback(
    async (data: ElderlyCreateRequest) => {
      try {
        setElderlyLoading(true);
        const elderly = await elderlyService.create(data);
        await fetchList();
        return elderly;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || '어르신 등록 실패');
        throw error;
      } finally {
        setElderlyLoading(false);
      }
    },
    [setElderlyLoading, setError, fetchList]
  );

  const update = useCallback(
    async (id: number, data: Partial<ElderlyCreateRequest>) => {
      try {
        setElderlyLoading(true);
        const elderly = await elderlyService.update(id, data);
        await fetchById(id);
        return elderly;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || '어르신 정보 수정 실패');
        throw error;
      } finally {
        setElderlyLoading(false);
      }
    },
    [setElderlyLoading, setError, fetchById]
  );

  const deleteElderly = useCallback(
    async (id: number) => {
      try {
        setElderlyLoading(true);
        await elderlyService.delete(id);
        await fetchList();
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || '어르신 삭제 실패');
        throw error;
      } finally {
        setElderlyLoading(false);
      }
    },
    [setElderlyLoading, setError, fetchList]
  );

  return {
    elderlyList,
    currentElderly,
    elderlyLoading,
    error,
    fetchList,
    fetchById,
    create,
    update,
    delete: deleteElderly,
  };
};
