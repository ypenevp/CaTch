import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function AuthInput({ label, secure, ...props }) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{
        fontFamily: theme.font.regular, fontSize: 14,
        color: theme.textMuted, marginBottom: 8,
      }}>
        {label}
      </Text>

      <View style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: theme.surface, borderRadius: theme.radius,
        paddingHorizontal: 22, height: 58,
        borderWidth: 1, borderColor: focused ? theme.text : "transparent",
      }}>
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
