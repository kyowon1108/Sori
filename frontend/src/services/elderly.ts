import { apiClient } from './api';
import { Elderly, ElderlyCreateRequest } from '@/types/elderly';

// Pairing types
interface PairingCodeResponse {
  code: string;
  expires_at: string;
}

interface PairingDevice {
  id: number;
  platform: string;
  device_name: string | null;
  last_used_at: string | null;
}

interface PairingStatusResponse {
  elderly_id: number;
  has_active_code: boolean;
  code_expires_at: string | null;
  paired_devices: PairingDevice[];
  device_count: number;
}

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

  // Pairing code methods
  async generatePairingCode(elderlyId: number): Promise<PairingCodeResponse> {
    const response = await apiClient.getClient().post(`/api/elderly/${elderlyId}/pairing-code`);
    return response.data.data;
  },

  async getPairingStatus(elderlyId: number): Promise<PairingStatusResponse> {
    const response = await apiClient.getClient().get(`/api/elderly/${elderlyId}/pairing-status`);
    return response.data.data;
  },

  async disconnectDevice(elderlyId: number, deviceId: number): Promise<void> {
    await apiClient.getClient().delete(`/api/elderly/${elderlyId}/devices/${deviceId}`);
  },
};
