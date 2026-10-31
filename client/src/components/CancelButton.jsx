import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/theme/theme";

export default function CancelButton({ title = "Cancel", onPress, busy = false, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy, disabled: busy }}
      style={[{
        height: 52, marginTop: theme.space.xl, borderRadius: theme.radius,
        borderWidth: 1.5, borderColor: theme.dangerBorder, backgroundColor: theme.dangerSoft,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.space.sm,
      }, style]}
    >
      {busy ? (
        <ActivityIndicator color={theme.danger} />
      ) : (
        <>
          <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.danger }}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
