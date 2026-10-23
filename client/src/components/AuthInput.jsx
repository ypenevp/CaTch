import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function AuthInput({ label, icon, secure, error, hint, ...props }) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;
  const iconColor = error ? theme.danger : focused ? theme.primary : theme.placeholder;

  return (
    <View style={{ marginBottom: theme.space.lg }}>
      <Text style={{
        fontFamily: theme.font.medium, fontSize: theme.size.sm,
        color: theme.text, marginBottom: theme.space.sm,
      }}>
        {label}
      </Text>

      <View style={{
        flexDirection: "row", alignItems: "center", gap: theme.space.md,
        backgroundColor: theme.surface, borderRadius: theme.radius,
        paddingHorizontal: theme.space.lg, height: 56,
        borderWidth: 1.5, borderColor,
        shadowColor: theme.primary, shadowOpacity: focused && !error ? 0.15 : 0,
        shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
      }}>
        {icon && <Ionicons name={icon} size={20} color={iconColor} />}
        <TextInput
          placeholderTextColor={theme.placeholder}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, height: "100%",
            fontFamily: theme.font.regular, fontSize: theme.size.md, color: theme.text,
          }}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setHidden(!hidden)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || hint) && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.xs, marginTop: theme.space.sm }}>
          {error && <Ionicons name="alert-circle" size={14} color={theme.danger} />}
          <Text style={{
            fontFamily: error ? theme.font.medium : theme.font.regular, fontSize: theme.size.xs,
            color: error ? theme.danger : theme.textMuted,
          }}>
            {error || hint}
          </Text>
        </View>
      )}
    </View>
  );
}
