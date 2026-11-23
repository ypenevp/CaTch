import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useRealtimeConnected } from "@/hooks/useRealtimeConnected";
import { getNotifications, getUnreadCount, markNotificationRead } from "@/services/notifications";
import { realtime, userNotificationsTopic } from "@/services/realtime";
import useAuthStore from "@/store/AuthStore";

const PAGE_SIZE = 20;
const OFFLINE_REFETCH_MS = 30000;

export const notificationKeys = {
  all: ["notifications"],
  list: () => [...notificationKeys.all, "list"],
  unreadCount: () => [...notificationKeys.all, "unread-count"],
};

// Spring returns the paging info either at the top level or inside "page"
function nextPageParam(lastPage) {
  const info = lastPage.page ?? lastPage;
  return info.number + 1 < info.totalPages ? info.number + 1 : undefined;
}

export function useNotifications() {
  const isLoggedIn = useAuthStore((s) => !!s.user);
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam, signal }) => getNotifications({ page: pageParam, size: PAGE_SIZE, signal }),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
    select: (data) => data.pages.flatMap((page) => page.content),
    enabled: isLoggedIn,
  });
}

export function useUnreadCount() {
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const connected = useRealtimeConnected();
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: ({ signal }) => getUnreadCount({ signal }),
    select: (data) => data.unreadCount,
    enabled: isLoggedIn,
    refetchInterval: connected ? false : OFFLINE_REFETCH_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useNotificationEvents() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const userId = profile?.id;

  useEffect(() => {
    if (!userId) return;
    return realtime.subscribe(userNotificationsTopic(userId), () =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    );
  }, [userId, queryClient]);
}
