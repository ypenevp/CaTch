import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import RetryBox from "@/components/RetryBox";
import { useDevice, useLatestMeasurement, useMeasurements } from "@/hooks/useDevices";
import useAuthStore from "@/store/AuthStore";
import { formatLastSeen, formatTimeAgo } from "@/utils/formatLastSeen";
import { formatClockTime } from "@/utils/formatClockTime";
import { theme } from "@/theme/theme";

const HISTORY_LIMIT = 20;

const card = {
  backgroundColor: theme.surface, borderRadius: theme.radius,
  borderWidth: 1, borderColor: theme.border, ...theme.shadow.card,
};

const sectionTitle = {
  fontFamily: theme.font.semibold, fontSize: theme.size.lg, color: theme.text,
  marginTop: theme.space.xl, marginBottom: theme.space.md,
};

function formatHeartRate(value) {
  return value == null ? "—" : String(value);
}

function formatSpo2(value) {
  return value == null ? "—" : String(Math.round(value));
}

function MetricCard({ icon, label, value, unit, metric }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value === "—" ? "no data" : `${value} ${unit}`}`}
      style={{ ...card, flex: 1, padding: theme.space.lg }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 12, backgroundColor: metric.bg,
        alignItems: "center", justifyContent: "center",
      }}>
        <MaterialCommunityIcons name={icon} size={22} color={metric.color} />
      </View>
      <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.sm, color: theme.textMuted, marginTop: theme.space.md }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: theme.space.xs, marginTop: theme.space.xs }}>
        <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.display, color: theme.text }}>{value}</Text>
        <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.sm, color: theme.textMuted }}>{unit}</Text>
      </View>
    </View>
  );
}

function HistoryRow({ measurement, isFirst }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingVertical: theme.space.md, paddingHorizontal: theme.space.lg,
      borderTopWidth: isFirst ? 0 : 1, borderTopColor: theme.border,
    }}>
      <Text style={{ flex: 1, fontFamily: theme.font.regular, fontSize: theme.size.sm, color: theme.textMuted }}>
        {formatClockTime(measurement.measuredAt)}
      </Text>
      <Text style={{ width: 80, fontFamily: theme.font.medium, fontSize: theme.size.sm, color: theme.metric.heart.color }}>
        {formatHeartRate(measurement.heartRate)} bpm
      </Text>
      <Text style={{ width: 60, textAlign: "right", fontFamily: theme.font.medium, fontSize: theme.size.sm, color: theme.metric.oxygen.color }}>
        {formatSpo2(measurement.spo2)} %
      </Text>
    </View>
  );
}

function LatestReading({ query }) {
  const { data: latest, isLoading, error, refetch, isFetching } = query;

  if (isLoading) return <ActivityIndicator color={theme.primary} style={{ marginTop: theme.space.md }} />;
  if (error) return <RetryBox message={error.message} onRetry={() => refetch()} busy={isFetching} />;

  if (!latest) {
    return (
      <View style={{ ...card, padding: theme.space.lg, alignItems: "center" }}>
        <MaterialCommunityIcons name="chart-line-variant" size={28} color={theme.placeholder} />
        <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.text, marginTop: theme.space.sm }}>
          No data yet
        </Text>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.sm, color: theme.textMuted, marginTop: theme.space.xs, textAlign: "center" }}>
          Your bracelet hasn't sent any measurements yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ flexDirection: "row", gap: theme.space.md }}>
        <MetricCard icon="heart-pulse" label="Heart rate" value={formatHeartRate(latest.heartRate)} unit="bpm" metric={theme.metric.heart} />
        <MetricCard icon="water-percent" label="Blood oxygen" value={formatSpo2(latest.spo2)} unit="%" metric={theme.metric.oxygen} />
      </View>
      <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.xs, color: theme.textMuted, marginTop: theme.space.sm }}>
        Updated {formatTimeAgo(latest.receivedAt)}
      </Text>
    </>
  );
}

export default function DeviceDetails() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams();
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const live = useIsFocused();

  const device = useDevice(deviceId, { live });
  const latest = useLatestMeasurement(deviceId, { live });
  const history = useMeasurements(deviceId, { limit: HISTORY_LIMIT, live });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!isLoggedIn) return <Redirect href="/" />;

  const online = device.data?.online;
  const statusText = online ? "Online" : formatLastSeen(device.data?.lastSeen);
  const readings = history.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space.lg, paddingBottom: theme.space.xl }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md }}>
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 44, height: 44, borderRadius: theme.radius,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xl, color: theme.text }}
          >
            {deviceId}
          </Text>
          {device.data && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? theme.success : theme.placeholder }} />
              <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.xs, color: online ? theme.successText : theme.textMuted }}>
                {statusText}
              </Text>
            </View>
          )}
        </View>
      </View>

      {device.isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: theme.space.xl }} />
      ) : device.error ? (
        <View style={{ marginTop: theme.space.xl }}>
          <RetryBox message={device.error.message} onRetry={() => device.refetch()} busy={device.isFetching} />
        </View>
      ) : (
        <>
          <Text accessibilityRole="header" style={sectionTitle}>Latest reading</Text>
          <LatestReading query={latest} />

          {readings.length > 0 && (
            <>
              <Text accessibilityRole="header" style={sectionTitle}>Recent readings</Text>
              <View style={card}>
                {readings.map((measurement, i) => (
                  <HistoryRow
                    key={`${measurement.measuredAt}-${measurement.receivedAt}-${i}`}
                    measurement={measurement}
                    isFirst={i === 0}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
