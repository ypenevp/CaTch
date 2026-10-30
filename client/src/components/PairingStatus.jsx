import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/theme/theme";
import AuthHeader from "@/components/AuthHeader";
import PrimaryButton from "@/components/PrimaryButton";
import ErrorBox from "@/components/ErrorBox";
import { useCancelPairing, usePairing } from "@/hooks/useDevices";

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function TextLink({ title, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={12}
      accessibilityRole="button"
      style={{ alignSelf: "center", marginTop: theme.space.lg, paddingVertical: theme.space.xs }}
    >
      <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function CancelPairingButton({ onPress, busy }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Cancel pairing"
      accessibilityState={{ busy, disabled: busy }}
      style={{
        height: 52, marginTop: theme.space.xl, borderRadius: theme.radius,
        borderWidth: 1.5, borderColor: theme.dangerBorder, backgroundColor: theme.dangerSoft,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.space.sm,
      }}
    >
      {busy ? (
        <ActivityIndicator color={theme.danger} />
      ) : (
        <>
          <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.danger }}>
            Cancel pairing
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function DevTokenBox({ token }) {
  if (!__DEV__ || !token) return null;

  return (
    <View style={{
      marginTop: theme.space.xl, padding: theme.space.md, borderRadius: theme.radius,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface,
    }}>
      <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.xs, color: theme.textMuted, marginBottom: theme.space.xs }}>
        Dev only · pairing token (long-press to copy)
      </Text>
      <Text selectable style={{ fontFamily: theme.font.regular, fontSize: theme.size.xs, color: theme.text }}>
        {token}
      </Text>
    </View>
  );
}

export default function PairingStatus({ pairing: created, onDone, onLeave, onRetry }) {
  const expiresAtMs = new Date(created.expiresAt).getTime();
  const [now, setNow] = useState(Date.now());
  const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
  const isExpired = secondsLeft === 0;

  const { data: pairing, error } = usePairing(created.pairingId, { poll: !isExpired });
  const { mutate: cancel, isPending: isCancelling } = useCancelPairing();

  const status = pairing?.status ?? created.status;
  const isWaiting = status === "PENDING" && !isExpired;

  const isWaitingRef = useRef(isWaiting);
  isWaitingRef.current = isWaiting;
  const leftOnPurposeRef = useRef(false);

  useEffect(() => {
    if (!isWaiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isWaiting]);

  useEffect(() => () => {
    if (isWaitingRef.current && !leftOnPurposeRef.current) cancel(created.pairingId);
  }, [created.pairingId, cancel]);

  const handleCancel = () => {
    leftOnPurposeRef.current = true;
    cancel(created.pairingId, { onSettled: onLeave });
  };

  const content = { flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl };

  if (status === "PAIRED") {
    return (
      <ScrollView contentContainerStyle={content}>
        <AuthHeader
          icon="checkmark-circle"
          title="Bracelet connected"
          subtitle={`${created.deviceId} is now linked to your account.`}
        />
        <PrimaryButton title="Done" onPress={onDone} />
      </ScrollView>
    );
  }

  if (!isWaiting) {
    const wasCancelled = status === "CANCELLED";
    return (
      <ScrollView contentContainerStyle={content}>
        <AuthHeader
          icon="time-outline"
          title={wasCancelled ? "Pairing cancelled" : "Pairing expired"}
          subtitle={wasCancelled
            ? "This pairing was cancelled. Start again to add your bracelet."
            : "The bracelet didn't respond in time. Make sure it's on and try again."}
        />
        <PrimaryButton title="Try again" onPress={onRetry} />
        <TextLink title="Back to home" onPress={onLeave} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={content}>
      <AuthHeader
        icon="bluetooth"
        title="Waiting for your bracelet"
        subtitle="Keep the bracelet close and turned on. This usually takes less than a minute."
        onBack={handleCancel}
      />

      <ErrorBox message={error?.message} />

      <View style={{ alignItems: "center", gap: theme.space.md }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text
          accessibilityLabel={`Expires in ${Math.floor(secondsLeft / 60)} minutes ${secondsLeft % 60} seconds`}
          style={{ fontFamily: theme.font.medium, fontSize: theme.size.sm, color: theme.textMuted }}
        >
          Expires in {formatCountdown(secondsLeft)}
        </Text>
      </View>

      <CancelPairingButton onPress={handleCancel} busy={isCancelling} />

      <DevTokenBox token={created.pairingToken} />
    </ScrollView>
  );
}
