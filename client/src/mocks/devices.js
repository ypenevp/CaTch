import { MOCK_WEARER } from "@/mocks/wearer";
import { ApiError } from "@/services/apiClient";

export const MOCK_DEVICES_ENABLED = __DEV__ && true;

const MOCK_DELAY_MS = 400;
const SAMPLE_INTERVAL_MS = 1000;
const HOUR_MS = 60 * 60 * 1000;

const MOCKS = {
  MOCK_BRACELET_01: { id: -1, lastSeenAgoMs: 2000, baseHeartRate: 72, baseSpo2: 98 },
  MOCK_BRACELET_02: { id: -2, lastSeenAgoMs: 2 * HOUR_MS, baseHeartRate: 64, baseSpo2: null },
  MOCK_BRACELET_03: { id: -3, lastSeenAgoMs: null },
};

const STATS_BUCKET_MS = 10000;

const MOCK_ACTIVITY ={ walking: "walking", sitting: "still", lying: "lie_getup_transition", fallen: "fall" };

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

function pseudoRandom(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function sample(mock, atMs) {
  const t = Math.floor(atMs / SAMPLE_INTERVAL_MS);
  const wave = Math.sin(t / 10) * 6 + Math.sin(t / 37) * 4;
  const noise = pseudoRandom(t) * 2;
  return {
    measuredAt: new Date(t * SAMPLE_INTERVAL_MS).toISOString(),
    receivedAt: new Date(t * SAMPLE_INTERVAL_MS + 150).toISOString(),
    accelX: 0, accelY: 0, accelZ: 1,
    gyroX: 0, gyroY: 0, gyroZ: 0,
    heartRate: Math.round(mock.baseHeartRate + wave + noise),
    spo2: mock.baseSpo2 == null ? null : mock.baseSpo2 - Math.round(pseudoRandom(t + 7919) * 1.4),
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

export const getMockLatestAnalysis = async (deviceId) => {
  await wait();
  const seen = lastSeenMs(MOCKS[deviceId]);
  if (seen == null) throw new ApiError(404, "Analysis not found");
  return {
    deviceId,
    activity: MOCK_ACTIVITY[MOCK_WEARER.posture],
    fallDetected: MOCK_WEARER.posture === "fallen",
    analyzedAt: new Date(seen).toISOString(),
  };
};

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function summary(values) {
  if (!values.length) return { min: null, average: null, max: null, samples: 0 };
  return { min: Math.min(...values), average: mean(values), max: Math.max(...values), samples: values.length };
}

export const getMockStatistics = async (deviceId, { minutes }) => {
  await wait();
  const mock = MOCKS[deviceId];
  const seen = lastSeenMs(mock);
  const to = Date.now();
  const from = to - minutes * 60 * 1000;
  const points = [];
  const heartRates = [];
  const spo2s = [];

  if (seen != null) {
    for (let start = Math.ceil(from / STATS_BUCKET_MS) * STATS_BUCKET_MS; start < to; start += STATS_BUCKET_MS) {
      const bucket = [];
      for (let at = start; at < start + STATS_BUCKET_MS && at <= seen; at += SAMPLE_INTERVAL_MS) bucket.push(sample(mock, at));
      if (!bucket.length) continue;

      const hr = bucket.map((s) => s.heartRate);
      const spo2 = bucket.map((s) => s.spo2).filter((v) => v != null);
      heartRates.push(...hr);
      spo2s.push(...spo2);
      points.push({
        start: new Date(start).toISOString(),
        end: new Date(start + STATS_BUCKET_MS).toISOString(),
        heartRateAverage: mean(hr),
        spo2Average: spo2.length ? mean(spo2) : null,
        heartRateSamples: hr.length,
        spo2Samples: spo2.length,
      });
    }
  }

  return {
    deviceId,
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    bucketSeconds: STATS_BUCKET_MS / 1000,
    heartRate: summary(heartRates),
    spo2: summary(spo2s),
    points,
  };
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
