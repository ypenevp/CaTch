import { useEffect } from "react";
import { AppState } from "react-native";
import { deviceKeys } from "@/hooks/useDevices";
import { queryClient } from "@/lib/queryClient";
import { realtime } from "@/services/realtime";
import useAuthStore from "@/store/AuthStore";

export function useRealtimeConnection() {
  const isLoggedIn = useAuthStore((s) => !!s.user);

  useEffect(() => {
    if (!isLoggedIn) return;

    let hasConnected = false;
    const stopStatus = realtime.onStatusChange(() => {
      if (!realtime.isConnected()) return;
      if (hasConnected) queryClient.invalidateQueries({ queryKey: deviceKeys.all });
      hasConnected = true;
    });

    const appState = AppState.addEventListener("change", (status) => {
      if (status === "active") realtime.connect();
      else if (status === "background") realtime.disconnect();
    });

    realtime.connect();

    return () => {
      appState.remove();
      stopStatus();
      realtime.disconnect();
    };
  }, [isLoggedIn]);
}
