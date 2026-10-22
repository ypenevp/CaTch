import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function AuthInput({ label, icon, secure, ...props }) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{
        fontFamily: theme.font.medium, fontSize: 14,
        color: theme.textMuted, marginBottom: 8,
      }}>
        {label}
      </Text>

      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: theme.surface, borderRadius: theme.radius,
        paddingHorizontal: 16, height: 56,
        borderWidth: 1.5, borderColor: focused ? theme.primary : theme.border,
        shadowColor: theme.primary, shadowOpacity: focused ? 0.15 : 0,
        shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
      }}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? theme.primary : theme.placeholder}
          />
        )}
        <TextInput
          placeholderTextColor={theme.placeholder}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, height: "100%",
            fontFamily: theme.font.regular, fontSize: 16, color: theme.text,
          }}
        />
        {secure && (
          <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={10}>
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
