import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function AuthHeader({ icon, title, subtitle, onBack, onClose }) {
  const onPress = onClose || onBack;

  return (
    <View style={{ marginBottom: theme.space.xxl }}>
      <View style={{ height: 44 }}>
        {onPress && (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={onClose ? "Close" : "Go back"}
            style={{
              width: 44, height: 44, borderRadius: theme.radius,
              backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.border,
              alignItems: "center", justifyContent: "center", marginTop: theme.space.xs,
            }}
          >
            <Ionicons name={onClose ? "close" : "arrow-back"} size={22} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ alignItems: "center", marginTop: theme.space.xl }}>
        {icon && (
          <View style={{
            width: 68, height: 68,
            alignItems: "center", justifyContent: "center", marginBottom: theme.space.lg,
          }}>
            <Ionicons name={icon} size={64} color={theme.primary} />
          </View>
        )}

        <Text
          accessibilityRole="header"
          style={{
            fontFamily: theme.font.semibold, fontSize: theme.size.display, color: theme.text,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text style={{
          fontFamily: theme.font.regular, fontSize: theme.size.md, lineHeight: 24,
          color: theme.textMuted, textAlign: "center", marginTop: theme.space.sm,
          paddingHorizontal: theme.space.sm,
        }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
