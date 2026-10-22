import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

const VARIANTS = {
  error: {
    icon: "alert-circle-outline",
    bg: theme.dangerSoft, border: theme.dangerBorder, color: theme.danger,
  },
  info: {
    icon: "information-circle-outline",
    bg: theme.primarySoft, border: theme.primaryBorder, color: theme.primaryDark,
  },
  success: {
    icon: "checkmark-circle-outline",
    bg: theme.successSoft, border: theme.successTint, color: theme.successText,
  },
};

export default function Banner({ message, variant = "info" }) {
  if (!message) return null;
  const v = VARIANTS[variant];

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row", alignItems: "center", gap: theme.space.md,
        backgroundColor: v.bg, borderRadius: theme.radius,
        borderWidth: 1, borderColor: v.border,
        paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md,
        marginBottom: theme.space.lg,
      }}
    >
      <Ionicons name={v.icon} size={20} color={v.color} />
      <Text style={{
        flex: 1, fontFamily: theme.font.medium, fontSize: theme.size.sm, color: v.color,
      }}>
        {message}
      </Text>
    </View>
  );
}
