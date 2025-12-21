import { apiClient } from './api';
import { Elderly, ElderlyCreateRequest } from '@/types/elderly';

export const elderlyService = {
  async getList(skip: number = 0, limit: number = 100): Promise<Elderly[]> {
    const response = await apiClient.getClient().get('/api/elderly', {
      params: { skip, limit },
    });
    // Backend returns { data: { items: [], total: number } } or { data: [] }
    const data = response.data?.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data?.items && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  },

  async getById(id: number): Promise<Elderly> {
    const response = await apiClient.getClient().get(`/api/elderly/${id}`);
    return response.data.data;
  },

  async create(data: ElderlyCreateRequest): Promise<Elderly> {
    const response = await apiClient.getClient().post('/api/elderly', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<ElderlyCreateRequest>): Promise<Elderly> {
    const response = await apiClient.getClient().put(`/api/elderly/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.getClient().delete(`/api/elderly/${id}`);
  },
};
