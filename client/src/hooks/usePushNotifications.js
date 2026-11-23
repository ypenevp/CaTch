import { useEffect, useRef } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Device from "expo-device";
import { useQueryClient } from "@tanstack/react-query";
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from "@react-native-firebase/messaging";
import { notificationKeys } from "@/hooks/useNotifications";
import { registerPushToken } from "@/services/notifications";
import useAuthStore from "@/store/AuthStore";

const ANDROID_13 = 33;

// RNFirebase requestPermission() does not ask on Android, so POST_NOTIFICATIONS is requested directly
async function requestPermission() {
  if (Platform.OS !== "android" || Platform.Version < ANDROID_13) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function register(token) {
  return registerPushToken({
    token,
    platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    deviceName: Device.modelName ?? undefined,
  });
}

export function usePushNotifications() {
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const openedInitial = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    const messaging = getMessaging();
    let cancelled = false;

    (async () => {
      try {
        if (!(await requestPermission()) || cancelled) return;
        const token = await getToken(messaging);
        if (!cancelled) await register(token);
      } catch (error) {
        console.warn("Push registration failed:", error.message);
      }
    })();

    const stopRefresh = onTokenRefresh(messaging, (token) => {
      register(token).catch((error) => console.warn("Push token refresh failed:", error.message));
    });
    const stopForeground = onMessage(messaging, () =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    );

    return () => {
      cancelled = true;
      stopRefresh();
      stopForeground();
    };
  }, [isLoggedIn, queryClient]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const messaging = getMessaging();
    const open = (message) => {
      const deviceId = message?.data?.deviceId;
      if (deviceId) router.push(`/devices/${encodeURIComponent(deviceId)}`);
    };

    if (!openedInitial.current) {
      openedInitial.current = true;
      getInitialNotification(messaging).then(open);
    }
    return onNotificationOpenedApp(messaging, open);
  }, [isLoggedIn, router]);
}
