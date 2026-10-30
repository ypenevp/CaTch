import { AppState, Platform } from "react-native";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: (failureCount, error) => {
        if ([400, 401, 403, 404].includes(error?.status)) return false;
        return failureCount < 2;
      },
    },
  },
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected))
);

export function subscribeAppFocus() {
  const subscription = AppState.addEventListener("change", (status) => {
    if (Platform.OS !== "web") focusManager.setFocused(status === "active");
  });
  return () => subscription.remove();
}
