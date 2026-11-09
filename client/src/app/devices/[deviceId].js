import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import Banner from "@/components/Banner";
import PostureFigure, { POSTURE_LABELS } from "@/components/PostureFigure";
import RetryBox from "@/components/RetryBox";
import VitalRing from "@/components/VitalRing";
import VitalsTrend from "@/components/VitalsTrend";
import { useDevice, useLatestMeasurement, useMeasurements } from "@/hooks/useDevices";
import { MOCK_WEARER } from "@/mocks/wearer";
import useAuthStore from "@/store/AuthStore";
import { formatLastSeen } from "@/utils/formatLastSeen";
import { theme } from "@/theme/theme";

const TREND_LIMIT = 120;
const VITALS_W = 104;
const HR_SCALE = [40, 160];
const SPO2_SCALE = [85, 100];

const SEX_LABELS = { female: "Female", male: "Male" };

const card = {
  backgroundColor: theme.surface, borderRadius: theme.radius,
  borderWidth: 1, borderColor: theme.border, ...theme.shadow.card,
};

const sectionTitle = {
  fontFamily: theme.font.semibold, fontSize: theme.size.lg, color: theme.text,
};

function SectionHeader({ title, children }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginTop: theme.space.xl, marginBottom: theme.space.md, minHeight: 40,
    }}>
      <Text accessibilityRole="header" style={sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatusDot({ online }) {
  return (
    <View
      accessible
      accessibilityLabel={online ? "Online" : "Offline"}
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: online ? theme.success : theme.textMuted }}
    />
  );
}

function rangeOf(measurements, key) {
  const values = measurements.map((m) => m[key]).filter((v) => v != null);
  return values.length ? { lo: Math.min(...values), hi: Math.max(...values) } : null;
}

function RingWithCaption({ caption, children }) {
  return (
    <View style={{ alignItems: "center" }}>
      {children}
      <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.xs, color: theme.textMuted, marginTop: -theme.space.sm, fontWeight: "bold" }}>
        {caption}
      </Text>
    </View>
  );
}

function LatestReading({ query, measurements = [], online, active }) {
  const [cardWidth, setCardWidth] = useState(0);
  const { data: latest, isLoading, error, refetch, isFetching } = query;

  const posture = MOCK_WEARER.posture;
  const fallen = posture === "fallen" && online;
  const figureWidth = cardWidth - theme.space.lg * 2 - theme.space.md - VITALS_W;
  const heartRate = latest?.heartRate ?? null;
  const spo2 = latest?.spo2 ?? null;

  return (
    <>
      {fallen && (
        <View style={{ marginTop: theme.space.md }}>
          <Banner variant="error" message="Possible fall detected. Check on them now." />
        </View>
      )}

      <SectionHeader title="Latest reading" />

      <View
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
        style={{ ...card, flexDirection: "row", alignItems: "center", padding: theme.space.lg, gap: theme.space.md }}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          {cardWidth > 0 && (
            <PostureFigure
              posture={posture}
              bpm={latest?.heartRate}
              online={online}
              active={active}
              width={figureWidth}
            />
          )}
          <Text style={{
            fontFamily: theme.font.semibold, fontSize: theme.size.lg, marginTop: theme.space.sm, textAlign: "center",
            color: fallen ? theme.danger : online ? theme.text : theme.textMuted,
          }}>
            {online ? POSTURE_LABELS[posture] : `Last known: ${POSTURE_LABELS[posture]}`}
          </Text>
        </View>

        <View style={{ width: VITALS_W, alignItems: "center", gap: theme.space.sm }}>
          {isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <RingWithCaption caption="Heart rate">
                <VitalRing
                  value={heartRate} min={HR_SCALE[0]} max={HR_SCALE[1]} range={rangeOf(measurements, "heartRate")}
                  label="bpm" name="Heart rate" unit="bpm" metric={theme.metric.heart}
                  online={online} active={active} pulseBpm={heartRate} size={VITALS_W}
                />
              </RingWithCaption>
              <RingWithCaption caption="Blood oxygen">
                <VitalRing
                  value={spo2} min={SPO2_SCALE[0]} max={SPO2_SCALE[1]} range={rangeOf(measurements, "spo2")}
                  label="%" name="Blood oxygen" unit="percent" metric={theme.metric.oxygen}
                  online={online} active={active} size={VITALS_W}
                />
              </RingWithCaption>
              {!error && !latest && (
                <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.xs, color: theme.textMuted }}>
                  No data yet
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {error && (
        <View style={{ marginTop: theme.space.md }}>
          <RetryBox message={error.message} onRetry={() => refetch()} busy={isFetching} />
        </View>
      )}
    </>
  );
}

function Trends({ query }) {
  const { data, isLoading, error, refetch, isFetching } = query;

  return (
    <>
      <SectionHeader title="Trends" />
      {isLoading ? (
        <ActivityIndicator color={theme.primary} />
      ) : error ? (
        <RetryBox message={error.message} onRetry={() => refetch()} busy={isFetching} />
      ) : (
        <VitalsTrend measurements={data ?? []} />
      )}
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
  const history = useMeasurements(deviceId, { limit: TREND_LIMIT, live });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!isLoggedIn) return <Redirect href="/" />;

  const online = !!device.data?.online;
  const sex = MOCK_WEARER.sex;

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
        <Text accessibilityRole="header" style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xl, color: theme.text }}>
          My bracelet
        </Text>
      </View>

      <View style={{ ...card, flexDirection: "row", alignItems: "center", gap: theme.space.md, padding: theme.space.lg, marginTop: theme.space.lg }}>
        <View style={{
          width: 44, height: 44, borderRadius: 12, backgroundColor: theme.primarySoft,
          alignItems: "center", justifyContent: "center",
        }}>
          <MaterialCommunityIcons name="watch-variant" size={22} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.sm }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: theme.font.semibold, fontSize: theme.size.lg, color: theme.text }}>
              {deviceId}
            </Text>
            {device.data && <StatusDot online={online} />}
          </View>
          {device.data && !online && (
            <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.xs, color: theme.textMuted, marginTop: 2 }}>
              {formatLastSeen(device.data.lastSeen)}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.xs, marginTop: theme.space.sm }}>
            <MaterialCommunityIcons name={sex === "male" ? "gender-male" : "gender-female"} size={16} color={theme.textMuted} />
            <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.sm, color: theme.textMuted }}>
              Wearer ·{" "}
              <Text style={{ fontFamily: theme.font.medium, color: theme.text }}>{SEX_LABELS[sex]}</Text>
            </Text>
          </View>
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
          <LatestReading query={latest} measurements={history.data ?? []} online={online} active={live} />
          <Trends query={history} />
        </>
      )}
    </ScrollView>
  );
}
