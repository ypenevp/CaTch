import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { theme } from "../theme";

export default function PrimaryButton({ title, onPress, loading, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[{
        backgroundColor: theme.primary, height: 58, borderRadius: theme.radius,
        alignItems: "center", justifyContent: "center",
        opacity: loading ? 0.75 : 1,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ fontFamily: theme.font.medium, color: "#fff", fontSize: 17 }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
