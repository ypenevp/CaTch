import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function AuthHeader({ title, subtitle, onBack }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{ height: 44 }}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: theme.surface,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={{
        fontFamily: theme.font.medium, fontSize: 32, color: theme.text,
        textAlign: "center", marginTop: 28,
      }}>
        {title}
      </Text>
      <Text style={{
        fontFamily: theme.font.regular, fontSize: 15, lineHeight: 22,
        color: theme.textMuted, textAlign: "center", marginTop: 10,
        paddingHorizontal: 8,
      }}>
        {subtitle}
      </Text>
    </View>
  );
}
