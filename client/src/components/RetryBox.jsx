import { Text, TouchableOpacity, View } from "react-native";
import { theme } from "@/theme/theme";
import ErrorBox from "@/components/ErrorBox";

export default function RetryBox({ message, onRetry, busy = false }) {
  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: theme.radius,
      borderWidth: 1, borderColor: theme.border, ...theme.shadow.card,
      padding: theme.space.lg,
    }}>
      <ErrorBox message={message} />
      <TouchableOpacity
        onPress={onRetry}
        disabled={busy}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
        style={{ alignSelf: "center", marginTop: theme.space.md, paddingVertical: theme.space.xs }}
      >
        <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>
          {busy ? "Retrying…" : "Try again"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
