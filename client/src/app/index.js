import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons";
import BraceletArt from "@/components/BraceletArt";
import PrimaryButton from "@/components/PrimaryButton";
import ErrorBox from "@/components/ErrorBox";
import { useProfile } from "@/hooks/useProfile";
import useAuthStore from "../store/AuthStore.js";
import useUIStore from "../store/UIStore.js";
import { theme } from "../theme/theme";

const MOCK_DEVICES = [
  { id: "1", name: "Device #1", online: true},
  { id: "2", name: "Device #2", online: true},
  { id: "3", name: "Device #3", online: false},
];

const FEATURES = [
  { icon: "heart-pulse", ...theme.metric.heart, title: "Heart rate", text: "Live pulse from your wrist" },
  { icon: "water-percent", ...theme.metric.oxygen, title: "Blood oxygen", text: "SpO₂ checks through the day" },
  { icon: "person-falling-burst", fa: true, ...theme.metric.fall, title: "Fall detection", text: "Alerts your contacts instantly" },
];

const card = {
  backgroundColor: theme.surface, borderRadius: theme.radius,
  borderWidth: 1, borderColor: theme.border, ...theme.shadow.card,
};

function Hero({ title, text, cta, ctaIcon, onPress, secondary, onSecondary }) {
  return (
    <View style={{ ...card, padding: theme.space.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md }}>
        <BraceletArt scale={0.85} />

        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: theme.font.semibold, fontSize: theme.size.lg, lineHeight: 24, color: theme.text }}>
            {title}
          </Text>
          <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.sm, lineHeight: 20, color: theme.textMuted, marginTop: theme.space.sm }}>
            {text}
          </Text>
        </View>
      </View>

      <PrimaryButton
        title={cta}
        icon={ctaIcon}
        onPress={onPress}
        style={{ marginTop: theme.space.lg, height: 52 }}
      />

      {secondary && (
        <TouchableOpacity
          onPress={onSecondary}
          hitSlop={8}
          accessibilityRole="button"
          style={{ alignSelf: "center", marginTop: theme.space.md, paddingVertical: theme.space.xs }}
        >
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>
            {secondary}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FeatureRow({ feature }) {
  const Icon = feature.fa ? FontAwesome6 : MaterialCommunityIcons;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md, paddingVertical: theme.space.md }}>
      <View style={{
        width: 44, height: 44, borderRadius: 12, backgroundColor: feature.bg,
        alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={feature.icon} size={feature.fa ? 18 : 22} color={feature.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.text }}>{feature.title}</Text>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.sm, color: theme.textMuted, marginTop: 2 }}>{feature.text}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, count, action, onAction }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      marginTop: theme.space.xl, marginBottom: theme.space.md,
    }}>
      <Text accessibilityRole="header" style={{ fontFamily: theme.font.semibold, fontSize: theme.size.lg, color: theme.text }}>
        {title}
      </Text>
      {count !== undefined && (
        <View style={{
          backgroundColor: theme.primarySoft, borderRadius: 10,
          paddingHorizontal: 10, paddingVertical: 2, marginLeft: theme.space.sm,
        }}>
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xs, color: theme.primary }}>
            {count}
          </Text>
        </View>
      )}

      {action && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          hitSlop={6}
          accessibilityRole="button"
          style={{
            marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: theme.space.xs,
            height: 36, paddingHorizontal: theme.space.md, borderRadius: 18,
            backgroundColor: theme.primarySoft,
          }}
        >
          <MaterialCommunityIcons name="plus" size={18} color={theme.primary} />
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DeviceItem({ device, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${device.online ? "online" : "offline"}`}
      style={{
        ...card, flexDirection: "row", alignItems: "center",
        padding: 14, marginBottom: 10, gap: theme.space.md,
      }}
    >
      <View style={{
        width: 46, height: 46, borderRadius: 12, backgroundColor: theme.primarySoft,
        alignItems: "center", justifyContent: "center",
      }}>
        <MaterialCommunityIcons name="watch-variant" size={26} color={theme.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.text }}>{device.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: device.online ? theme.success : theme.placeholder }} />
          <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.xs, color: device.online ? theme.successText : theme.textMuted }}>
            {device.online ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.placeholder} />
    </TouchableOpacity>
  );
}

function AccountCard() {
  const { data: profile, isLoading, error, refetch, isFetching } = useProfile();

  if (error) {
    return (
      <View style={{ ...card, padding: theme.space.lg }}>
        <ErrorBox message={error.message} />
        <TouchableOpacity
          onPress={() => refetch()}
          disabled={isFetching}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ busy: isFetching, disabled: isFetching }}
          style={{ alignSelf: "center", marginTop: theme.space.md, paddingVertical: theme.space.xs }}
        >
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>
            {isFetching ? "Retrying…" : "Try again"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ ...card, flexDirection: "row", alignItems: "center", padding: theme.space.lg, gap: 14 }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary,
        alignItems: "center", justifyContent: "center",
      }}>
        <MaterialCommunityIcons name="account" size={32} color={theme.onPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.xs, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Account
        </Text>
        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ alignSelf: "flex-start", marginTop: theme.space.sm }} />
        ) : (
          <>
            <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xl, color: theme.text, marginTop: 2 }}>
              {profile.username}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: theme.font.regular, fontSize: theme.size.sm, color: theme.textMuted, marginTop: 2 }}>
              {profile.email}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function GuestHome() {
  const openSignup = useUIStore((state) => state.openSignup);
  const openLogin = useUIStore((state) => state.openLogin);

  return (
    <>
      <Hero
        title="Your health, always in sight"
        text="Pair a CaTch bracelet to track your vitals and get help the moment you need it."
        cta="Get started"
        onPress={openSignup}
        secondary="I already have an account"
        onSecondary={openLogin}
      />

      <SectionHeader title="What CaTch tracks" />
      <View style={{ ...card, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.xs }}>
        {FEATURES.map((feature, i) => (
          <View key={feature.title} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: theme.border }}>
            <FeatureRow feature={feature} />
          </View>
        ))}
      </View>
    </>
  );
}

function UserHome({ devices, onAddDevice }) {
  return (
    <>
      <View style={{ marginTop: theme.space.lg }}>
        <AccountCard />
      </View>

      {!devices.length ? (
        <View style={{ marginTop: theme.space.lg }}>
          <Hero
            title="Connect your first bracelet"
            text="Pulse, blood oxygen, fall detection, and more. Pair your bracelet to start monitoring in real time."
            cta="Add Device"
            ctaIcon="add-circle"
            onPress={onAddDevice}
          />
        </View>
      ) : (
        <>
          <SectionHeader
            title="Connected Devices"
            count={devices.length}
            action="Add"
            onAction={onAddDevice}
          />

          {devices.map((device) => (
            <DeviceItem key={device.id} device={device} onPress={() => {}} />
          ))}
        </>
      )}
    </>
  );
}

export default function Home() {
  const isLoggedIn = useAuthStore((state) => !!state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const handleAddDevice = () => {};

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space.lg, paddingBottom: theme.space.xl }}
    >
      {!isLoading && (isLoggedIn
        ? <UserHome devices={MOCK_DEVICES} onAddDevice={handleAddDevice} />
        : <GuestHome />)}
    </ScrollView>
  );
}
