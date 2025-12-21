import { apiClient } from './api';
import { Call } from '@/types/calls';

export const callsService = {
  async getList(elderly_id?: number, skip: number = 0, limit: number = 100): Promise<Call[]> {
    const params: Record<string, number> = { skip, limit };
    if (elderly_id) params.elderly_id = elderly_id;

    const response = await apiClient.getClient().get('/api/calls', { params });
    // Backend returns { data: { items: [], total: number } }
    return response.data.data.items || response.data.data;
  },

  async getById(id: number): Promise<Call> {
    const response = await apiClient.getClient().get(`/api/calls/${id}`);
    return response.data.data;
  },

  async startCall(elderly_id: number, call_type: string = 'voice'): Promise<Call> {
    const response = await apiClient.getClient().post('/api/calls/start', {
      elderly_id,
      call_type,
    });
    return response.data.data;
  },

  async endCall(id: number): Promise<Call> {
    const response = await apiClient.getClient().post(`/api/calls/${id}/end`);
    return response.data.data;
  },
};
