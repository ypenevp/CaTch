import { useNotificationEvents } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Lives inside QueryClientProvider; the root layout itself is outside it
export default function NotificationListener() {
  useNotificationEvents();
  usePushNotifications();
  return null;
}
