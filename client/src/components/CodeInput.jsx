import { useState } from "react";
import { Text, View, TextInput } from "react-native";
import { theme } from "../theme/theme";

export default function CodeInput({ value, onChangeText, length = 6, autoFocus }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 28 }}>
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
                borderColor: isActive
                  ? theme.primary
                  : isFilled ? theme.primaryBorder : theme.border,
                shadowColor: theme.primary, shadowOpacity: isActive ? 0.18 : 0,
                shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
              }}
            >
              <Text style={{
                fontFamily: theme.font.semibold, fontSize: 24,
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
      />
    </View>
  );
}
