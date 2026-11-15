import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deviceKeys } from "@/hooks/useDevices";
import { isMockDevice } from "@/mocks/devices";
import { deviceTopic, realtime } from "@/services/realtime";

function updateDevice(queryClient, deviceId, changes) {
  queryClient.setQueryData(deviceKeys.detail(deviceId), (old) => old && { ...old, ...changes });
  queryClient.setQueryData(deviceKeys.list(), (old) => old && {
    ...old,
    content: old.content.map((device) => (device.deviceId === deviceId ? { ...device, ...changes } : device)),
  });
}

function addMeasurement(queryClient, deviceId, measurement) {
  queryClient.setQueryData(deviceKeys.latest(deviceId), measurement);

  queryClient.getQueryCache().findAll({ queryKey: deviceKeys.measurementLists(deviceId) }).forEach(({ queryKey }) => {
    const limit = queryKey[queryKey.length - 1];
    queryClient.setQueryData(queryKey, (old) => {
      if (!old || old.content[0]?.measuredAt === measurement.measuredAt) return old;
      return { ...old, content: [measurement, ...old.content].slice(0, limit) };
    });
  });

  updateDevice(queryClient, deviceId, { online: true, lastSeen: measurement.receivedAt });
}

function applyEvent(queryClient, deviceId, event) {
  if (event.type === "measurement") addMeasurement(queryClient, deviceId, event.data);
  else if (event.type === "analysis") queryClient.setQueryData(deviceKeys.latestAnalysis(deviceId), event.data);
  else if (event.type === "status") updateDevice(queryClient, deviceId, { online: event.data.online, lastSeen: event.data.lastSeen });
}

export function useDeviceEvents(deviceIds, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const ids = deviceIds.filter((deviceId) => !isMockDevice(deviceId)).join(",");

  useEffect(() => {
    if (!enabled || !ids) return;
    const unsubscribes = ids.split(",").map((deviceId) =>
      realtime.subscribe(deviceTopic(deviceId), (event) => applyEvent(queryClient, deviceId, event))
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [ids, enabled, queryClient]);
}
