import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { theme } from "../theme/theme";

export default function PrimaryButton({ title, onPress, loading, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[{
        backgroundColor: loading ? "#94A3B8" : theme.primary,
        height: 56, borderRadius: theme.radius,
        alignItems: "center", justifyContent: "center",
        shadowColor: theme.primary, shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 8 }, shadowRadius: 14, elevation: 6,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{
          fontFamily: theme.font.semibold, color: "#fff",
          fontSize: 17, letterSpacing: 0.3,
        }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
