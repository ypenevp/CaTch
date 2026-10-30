import { api } from "@/services/apiClient";
import {
  MOCK_DEVICES_ENABLED,
  getMockDevice,
  getMockLatestMeasurement,
  getMockMeasurements,
  isMockDevice,
  withMockDevices,
} from "@/mocks/devices";

export const getMyDevices = async ({ signal } = {}) => {
  const page = await api.get("/api/v1/devices/my", { signal });
  return MOCK_DEVICES_ENABLED ? withMockDevices(page) : page;
};

export const getDevice = async (deviceId, { signal } = {}) => {
  if (isMockDevice(deviceId)) return getMockDevice(deviceId);
  return api.get(`/api/v1/devices/${encodeURIComponent(deviceId)}`, { signal });
};

export const getLatestMeasurement = async (deviceId, { signal } = {}) => {
  if (isMockDevice(deviceId)) return getMockLatestMeasurement(deviceId);
  return api.get(`/api/v1/devices/${encodeURIComponent(deviceId)}/measurements/latest`, { signal });
};

export const getMeasurements = async (deviceId, { limit, signal } = {}) => {
  if (isMockDevice(deviceId)) return getMockMeasurements(deviceId, { limit });
  return api.get(`/api/v1/devices/${encodeURIComponent(deviceId)}/measurements?limit=${limit}`, { signal });
};

export const createPairing = async ({ deviceId }) => {
  return api.post("/api/v1/device-pairings", { deviceId });
};

export const getPairing = async (pairingId, { signal } = {}) => {
  return api.get(`/api/v1/device-pairings/${encodeURIComponent(pairingId)}`, { signal });
};

export const cancelPairing = async (pairingId) => {
  return api.delete(`/api/v1/device-pairings/${encodeURIComponent(pairingId)}`);
};
