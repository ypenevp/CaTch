import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelPairing,
  createPairing,
  getDevice,
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
  measurements: (deviceId, limit) => [...deviceKeys.detail(deviceId), "measurements", limit],
  pairing: (pairingId) => [...deviceKeys.all, "pairing", pairingId],
};

export function useDevices({ live = false } = {}) {
  const isLoggedIn = useAuthStore((s) => !!s.user);
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: ({ signal }) => getMyDevices({ signal }),
    select: (page) => page.content,
    enabled: isLoggedIn,
    refetchInterval: live ? LIVE_REFETCH_MS : false,
  });
}

export function useDevice(deviceId, { live = false } = {}) {
  return useQuery({
    queryKey: deviceKeys.detail(deviceId),
    queryFn: ({ signal }) => getDevice(deviceId, { signal }),
    enabled: !!deviceId,
    refetchInterval: live ? DEVICE_LIVE_MS : false,
  });
}

export function useLatestMeasurement(deviceId, { live = false } = {}) {
  return useQuery({
    queryKey: deviceKeys.latest(deviceId),
    queryFn: async ({ signal }) => {
      try {
        return await getLatestMeasurement(deviceId, { signal });
      } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!deviceId,
    refetchInterval: live ? DEVICE_LIVE_MS : false,
  });
}

export function useMeasurements(deviceId, { limit = 20, live = false } = {}) {
  return useQuery({
    queryKey: deviceKeys.measurements(deviceId, limit),
    queryFn: ({ signal }) => getMeasurements(deviceId, { limit, signal }),
    select: (page) => page.content,
    enabled: !!deviceId,
    refetchInterval: live ? LIVE_REFETCH_MS : false,
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
