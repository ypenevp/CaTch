import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function AuthHeader({ icon, title, subtitle, onBack }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{ height: 44 }}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={{
              width: 44, height: 44, borderRadius: theme.radius,
              backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.border,
              alignItems: "center", justifyContent: "center", marginTop: 4,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ alignItems: "center", marginTop: 20 }}>
        {icon && (
          <View style={{
            width: 130, height: 130,
            backgroundColor: theme.primarySoft,
            alignItems: "center", justifyContent: "center", marginBottom: 20,
          }}>
            <Ionicons name={icon} size={30} color={theme.primary} />
          </View>
        )}

        <Text style={{
          fontFamily: theme.font.semibold, fontSize: 30, color: theme.text,
          textAlign: "center", marginTop: 10
        }}>
          {title}
        </Text>
        <Text style={{
          fontFamily: theme.font.regular, fontSize: 15, lineHeight: 22,
          color: theme.textMuted, textAlign: "center", marginTop: 8,
          paddingHorizontal: 8,
        }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
