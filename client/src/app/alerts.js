import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import PrimaryButton from "@/components/PrimaryButton";
import RetryBox from "@/components/RetryBox";
import { useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import useAuthStore from "@/store/AuthStore";
import useUIStore from "@/store/UIStore";
import { formatTimeAgo } from "@/utils/formatLastSeen";
import { theme } from "@/theme/theme";

const mutedText = { fontFamily: theme.font.regular, fontSize: theme.size.md, color: theme.textMuted, textAlign: "center" };

function AlertRow({ alert, onPress }) {
  const unread = !alert.readAt;
  const time = formatTimeAgo(alert.createdAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${alert.title}, ${alert.deviceId}, ${time}${unread ? ", unread" : ""}`}
      style={{
        flexDirection: "row", alignItems: "center", gap: theme.space.md, padding: theme.space.lg,
        backgroundColor: unread ? theme.dangerSoft : theme.surface, borderRadius: theme.radius,
        borderWidth: 1, borderColor: unread ? theme.dangerBorder : theme.border,
      }}
    >
      <MaterialCommunityIcons name="alert-circle-outline" size={26} color={theme.danger} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.text }}>
          {alert.title}
        </Text>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.sm, color: theme.textMuted }}>
          {alert.deviceId} · {time}
        </Text>
      </View>
      {unread && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.danger }} />}
    </TouchableOpacity>
  );
}

function EmptyState({ isLoggedIn, isPending, isError, error, onRetry, retrying }) {
  const openLogin = useUIStore((s) => s.openLogin);

  if (!isLoggedIn) {
    return (
      <View style={{ gap: theme.space.lg, paddingTop: theme.space.xl }}>
        <Text style={mutedText}>Log in to see alerts from your bracelets.</Text>
        <PrimaryButton title="Log in" onPress={openLogin} />
      </View>
    );
  }
  if (isPending) return <ActivityIndicator color={theme.primary} style={{ paddingTop: theme.space.xl }} />;
  if (isError) return <RetryBox message={error.message} onRetry={onRetry} busy={retrying} />;
  return <Text style={{ ...mutedText, paddingTop: theme.space.xl }}>No alerts yet.</Text>;
}

export default function AlertsScreen() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const {
    data: alerts = [], isPending, isError, error, refetch, isRefetching,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useNotifications();
  const markRead = useMarkNotificationRead();

  const openAlert = (alert) => {
    if (!alert.readAt) markRead.mutate(alert.id);
    router.push(`/devices/${encodeURIComponent(alert.deviceId)}`);
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      data={isLoggedIn ? alerts : []}
      keyExtractor={(alert) => String(alert.id)}
      renderItem={({ item }) => <AlertRow alert={item} onPress={() => openAlert(item)} />}
      contentContainerStyle={{ padding: theme.space.lg, paddingBottom: theme.space.xl, gap: theme.space.md }}
      ListHeaderComponent={
        <Text accessibilityRole="header" style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xl, color: theme.text }}>
          Alerts
        </Text>
      }
      ListEmptyComponent={
        <EmptyState
          isLoggedIn={isLoggedIn}
          isPending={isPending}
          isError={isError}
          error={error}
          onRetry={refetch}
          retrying={isRefetching}
        />
      }
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={theme.primary} /> : null}
      onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshing={isLoggedIn && isRefetching && !isFetchingNextPage}
      onRefresh={isLoggedIn ? refetch : undefined}
    />
  );
}
