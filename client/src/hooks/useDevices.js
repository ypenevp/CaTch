import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeConnected } from "@/hooks/useRealtimeConnected";
import { isMockDevice } from "@/mocks/devices";
import {
  cancelPairing,
  createPairing,
  getDevice,
  getLatestAnalysis,
  getLatestMeasurement,
  getMeasurements,
  getMyDevices,
  getPairing,
} from "@/services/devices";
import useAuthStore from "@/store/AuthStore";

const LIVE_REFETCH_MS = 15000;
const DEVICE_LIVE_MS = 5000;
const PAIRING_POLL_MS = 2500;

export const deviceKeys = {
  all: ["devices"],
  list: () => [...deviceKeys.all, "list"],
  detail: (deviceId) => [...deviceKeys.all, "detail", deviceId],
  latest: (deviceId) => [...deviceKeys.detail(deviceId), "latest"],
  measurementLists: (deviceId) => [...deviceKeys.detail(deviceId), "measurements"],
  measurements: (deviceId, limit) => [...deviceKeys.measurementLists(deviceId), limit],
  latestAnalysis: (deviceId) => [...deviceKeys.detail(deviceId), "analysis", "latest"],
  pairing: (pairingId) => [...deviceKeys.all, "pairing", pairingId],
};

function usePollWhenOffline(live, deviceId) {
  const connected = useRealtimeConnected();
  return live && (!connected || isMockDevice(deviceId));
}

async function nullWhenNotFound(request) {
  try {
    return await request();
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export function useDevices({ live = false } = {}) {
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const poll = usePollWhenOffline(live);
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: ({ signal }) => getMyDevices({ signal }),
    select: (page) => page.content,
    enabled: isLoggedIn,
    refetchInterval: poll ? LIVE_REFETCH_MS : false,
  });
}

export function useDevice(deviceId, { live = false } = {}) {
  const poll = usePollWhenOffline(live, deviceId);
  return useQuery({
    queryKey: deviceKeys.detail(deviceId),
    queryFn: ({ signal }) => getDevice(deviceId, { signal }),
    enabled: !!deviceId,
    refetchInterval: poll ? DEVICE_LIVE_MS : false,
  });
}

export function useLatestMeasurement(deviceId, { live = false } = {}) {
  const poll = usePollWhenOffline(live, deviceId);
  return useQuery({
    queryKey: deviceKeys.latest(deviceId),
    queryFn: ({ signal }) => nullWhenNotFound(() => getLatestMeasurement(deviceId, { signal })),
    enabled: !!deviceId,
    refetchInterval: poll ? DEVICE_LIVE_MS : false,
  });
}

export function useMeasurements(deviceId, { limit = 20, live = false } = {}) {
  const poll = usePollWhenOffline(live, deviceId);
  return useQuery({
    queryKey: deviceKeys.measurements(deviceId, limit),
    queryFn: ({ signal }) => getMeasurements(deviceId, { limit, signal }),
    select: (page) => page.content,
    enabled: !!deviceId,
    refetchInterval: poll ? LIVE_REFETCH_MS : false,
  });
}

export function useLatestAnalysis(deviceId, { live = false } = {}) {
  const poll = usePollWhenOffline(live, deviceId);
  return useQuery({
    queryKey: deviceKeys.latestAnalysis(deviceId),
    queryFn: ({ signal }) => nullWhenNotFound(() => getLatestAnalysis(deviceId, { signal })),
    enabled: !!deviceId,
    refetchInterval: poll ? LIVE_REFETCH_MS : false,
  });
}

export function useCreatePairing() {
  return useMutation({ mutationFn: createPairing });
}

export function usePairing(pairingId, { poll = false } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: deviceKeys.pairing(pairingId),
    queryFn: ({ signal }) => getPairing(pairingId, { signal }),
    enabled: !!pairingId,
    refetchInterval: (q) => (poll && q.state.data?.status === "PENDING" ? PAIRING_POLL_MS : false),
  });

  const isPaired = query.data?.status === "PAIRED";
  useEffect(() => {
    if (isPaired) queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
  }, [isPaired, queryClient]);

  return query;
}

export function useCancelPairing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelPairing,
    onSuccess: (_, pairingId) => queryClient.removeQueries({ queryKey: deviceKeys.pairing(pairingId) }),
  });
}
