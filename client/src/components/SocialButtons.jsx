import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

function SocialButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, height: 54, borderRadius: theme.radius,
        backgroundColor: theme.surface, flexDirection: "row",
        alignItems: "center", justifyContent: "center", gap: 10,
      }}
    >
      <Ionicons name={icon} size={20} color={theme.text} />
      <Text style={{ fontFamily: theme.font.medium, fontSize: 15, color: theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function SocialButtons({ onGoogle, onApple }) {
  return (
    <>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <SocialButton icon="logo-google" label="Google" onPress={onGoogle} />
        <SocialButton icon="logo-apple" label="Apple" onPress={onApple} />
      </View>

      <View style={{
        flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 24,
      }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        <Text style={{ fontFamily: theme.font.regular, fontSize: 14, color: theme.textMuted }}>
          or
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      </View>
    </>
  );
}
