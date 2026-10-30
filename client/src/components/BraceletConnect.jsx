import { ActivityIndicator, ScrollView, View } from "react-native";
import { theme } from "@/theme/theme";
import AuthHeader from "@/components/AuthHeader";
import PrimaryButton from "@/components/PrimaryButton";
import CancelButton from "@/components/CancelButton";

function phaseContent(phase, deviceId) {
  switch (phase) {
    case "permission":
      return { icon: "bluetooth", title: "Allow Bluetooth", subtitle: "CaTch needs Bluetooth access to find your bracelet." };
    case "bluetooth":
      return { icon: "bluetooth", title: "Checking Bluetooth", subtitle: "Make sure Bluetooth is turned on." };
    case "scanning":
      return { icon: "search", title: "Looking for your bracelet", subtitle: `Searching for CaTch-${deviceId}. Keep it on and close to your phone.` };
    case "waitingConfirmation":
      return { icon: "radio-button-on", title: "Press the button on your bracelet", subtitle: "Press SELECT to confirm. The bracelet beeps while it waits." };
    default:
      return { icon: "bluetooth", title: "Connecting", subtitle: `Connecting to CaTch-${deviceId}…` };
  }
}

export default function BraceletConnect({ deviceId, phase, error, onRetry, onCancel }) {
  const content = { flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl };

  if (phase === "error") {
    return (
      <ScrollView contentContainerStyle={content}>
        <AuthHeader
          icon="alert-circle-outline"
          title="Couldn't connect"
          subtitle={error?.message}
          onBack={onCancel}
        />
        <PrimaryButton title="Try again" onPress={onRetry} />
        <CancelButton onPress={onCancel} />
      </ScrollView>
    );
  }

  const { icon, title, subtitle } = phaseContent(phase, deviceId);

  return (
    <ScrollView contentContainerStyle={content}>
      <AuthHeader icon={icon} title={title} subtitle={subtitle} onBack={onCancel} />
      <View style={{ alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
      <CancelButton onPress={onCancel} />
    </ScrollView>
  );
}
