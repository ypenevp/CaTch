import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

function SocialButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, height: 52, borderRadius: theme.radius,
        backgroundColor: theme.surface,
        borderWidth: 1.5, borderColor: theme.border,
        flexDirection: "row", alignItems: "center",
        justifyContent: "center", gap: 10,
      }}
    >
      <Ionicons name={icon} size={20} color={theme.text} />
      <Text style={{ fontFamily: theme.font.medium, fontSize: 15, color: theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// TODO: свържи onGoogle / onApple с expo-auth-session и expo-apple-authentication.
// Apple Sign-In работи само на iOS – за Android скрий бутона (Platform.OS === 'ios').
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
        <Text style={{ fontFamily: theme.font.regular, fontSize: 13, color: theme.placeholder }}>
          or continue with email
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      </View>
    </>
  );
}
