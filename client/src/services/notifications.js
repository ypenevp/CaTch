import { getMessaging, getToken } from "@react-native-firebase/messaging";
import { api } from "@/services/apiClient";

const BASE = "/api/v1/notifications";

export const getNotifications = ({ page = 0, size = 20, signal } = {}) =>
  api.get(`${BASE}?page=${page}&size=${size}`, { signal });

export const getUnreadCount = ({ signal } = {}) => api.get(`${BASE}/unread-count`, { signal });

export const markNotificationRead = (notificationId) => api.patch(`${BASE}/${notificationId}/read`);

export const registerPushToken = ({ token, platform, deviceName }) =>
  api.post(`${BASE}/push-tokens`, { token, platform, deviceName });

export const removeCurrentPushToken = async () => {
  const token = await getToken(getMessaging());
  await api.delete(`${BASE}/push-tokens`, { body: { token } });
};
