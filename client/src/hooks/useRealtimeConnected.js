import { useSyncExternalStore } from "react";
import { realtime } from "@/services/realtime";

export function useRealtimeConnected() {
  return useSyncExternalStore(realtime.onStatusChange, realtime.isConnected);
}
