import { ApiError } from "@/services/apiClient";

export const MOCK_DEVICES_ENABLED = __DEV__ && false;

const MOCK_DELAY_MS = 400;
const SAMPLE_INTERVAL_MS = 2000;
const HOUR_MS = 60 * 60 * 1000;

const MOCKS = {
  MOCK_BRACELET_01: { id: -1, lastSeenAgoMs: 2000, baseHeartRate: 72, baseSpo2: 98 },
  MOCK_BRACELET_02: { id: -2, lastSeenAgoMs: 2 * HOUR_MS, baseHeartRate: 64, baseSpo2: null },
  MOCK_BRACELET_03: { id: -3, lastSeenAgoMs: null },
};

const wait = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

export const isMockDevice = (deviceId) => MOCK_DEVICES_ENABLED && deviceId in MOCKS;

function lastSeenMs(mock) {
  return mock.lastSeenAgoMs == null ? null : Date.now() - mock.lastSeenAgoMs;
}

function toDevice(deviceId) {
  const mock = MOCKS[deviceId];
  const seen = lastSeenMs(mock);
  return {
    id: mock.id,
    deviceId,
    status: "ACTIVE",
    online: seen != null && Date.now() - seen < 10000,
    lastSeen: seen == null ? null : new Date(seen).toISOString(),
  };
}

function sample(mock, atMs) {
  const wave = Math.sin(atMs / 10000) * 6;
  const noise = Math.random() * 2;
  return {
    measuredAt: new Date(atMs).toISOString(),
    receivedAt: new Date(atMs + 150).toISOString(),
    accelX: 0, accelY: 0, accelZ: 1,
    gyroX: 0, gyroY: 0, gyroZ: 0,
    heartRate: Math.round(mock.baseHeartRate + wave + noise),
    spo2: mock.baseSpo2 == null ? null : mock.baseSpo2 - Math.round(Math.random()),
  };
}

export const withMockDevices = (page) => ({
  ...page,
  content: [...Object.keys(MOCKS).map(toDevice), ...page.content],
});

export const getMockDevice = async (deviceId) => {
  await wait();
  return toDevice(deviceId);
};

export const getMockLatestMeasurement = async (deviceId) => {
  await wait();
  const mock = MOCKS[deviceId];
  const seen = lastSeenMs(mock);
  if (seen == null) throw new ApiError(404, "Measurement not found");
  return sample(mock, seen);
};

export const getMockMeasurements = async (deviceId, { limit }) => {
  await wait();
  const mock = MOCKS[deviceId];
  const seen = lastSeenMs(mock);
  if (seen == null) return { content: [] };
  return {
    content: Array.from({ length: limit }, (_, i) => sample(mock, seen - i * SAMPLE_INTERVAL_MS)),
  };
};
