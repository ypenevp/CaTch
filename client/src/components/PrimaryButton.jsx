import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function PrimaryButton({ title, onPress, loading, icon, color = theme.primary, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
      style={[{
        backgroundColor: loading ? theme.placeholder : color,
        height: 56, borderRadius: theme.radius,
        alignItems: "center", justifyContent: "center",
        shadowColor: color, shadowOpacity: loading ? 0 : 0.3,
        shadowOffset: { width: 0, height: 8 }, shadowRadius: 14, elevation: loading ? 0 : 6,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color={theme.onPrimary} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.sm }}>
          {icon && <Ionicons name={icon} size={20} color={theme.onPrimary} />}
          <Text style={{
            fontFamily: theme.font.semibold, color: theme.onPrimary,
            fontSize: theme.size.md, letterSpacing: 0.3,
          }}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
