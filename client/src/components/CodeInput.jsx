import { useState } from "react";
import { Text, View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function CodeInput({ value, onChangeText, length = 6, autoFocus, error }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: theme.space.xl }}>
      <View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {Array.from({ length }).map((_, i) => {
            const isActive = focused && i === Math.min(value.length, length - 1);
            const isFilled = !!value[i];
            return (
              <View
                key={i}
                style={{
                  flex: 1, height: 62, borderRadius: theme.radius,
                  backgroundColor: isFilled ? theme.primarySoft : theme.surface,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: error
                    ? theme.danger
                    : isActive
                      ? theme.primary
                      : isFilled ? theme.primaryBorder : theme.border,
                  shadowColor: theme.primary, shadowOpacity: isActive && !error ? 0.18 : 0,
                  shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
                }}
              >
                <Text style={{
                  fontFamily: theme.font.semibold, fontSize: theme.size.xxl,
                  color: theme.primaryDark,
                }}>
                  {value[i] ?? ""}
                </Text>
              </View>
            );
          })}
        </View>

        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, "").slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus={autoFocus}
          caretHidden
          accessibilityLabel={`${length}-digit code`}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
        />
      </View>

      {error && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.xs, marginTop: theme.space.sm }}>
          <Ionicons name="alert-circle" size={14} color={theme.danger} />
          <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.xs, color: theme.danger }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}
