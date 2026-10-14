import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import PrimaryButton from "./PrimaryButton";

// Рендерира собствен затъмнен фон + bottom sheet (като в дизайна)
export default function Success({ onDone }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end",
    }}>
      <View style={{
        backgroundColor: theme.surface,
        borderTopLeftRadius: 36, borderTopRightRadius: 36,
        paddingHorizontal: 24, paddingTop: 36,
        paddingBottom: Math.max(insets.bottom, 16) + 8,
        alignItems: "center",
      }}>
        <View style={{
          width: 116, height: 116, borderRadius: 58,
          backgroundColor: theme.successSoft,
          alignItems: "center", justifyContent: "center", marginBottom: 24,
        }}>
          <View style={{
            width: 84, height: 84, borderRadius: 42, backgroundColor: theme.success,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="checkmark" size={46} color="#fff" />
          </View>
        </View>

        <Text style={{ fontFamily: theme.font.medium, fontSize: 28, color: theme.text }}>
          Successful!
        </Text>
        <Text style={{
          fontFamily: theme.font.regular, fontSize: 15, lineHeight: 22,
          color: theme.textMuted, textAlign: "center", marginTop: 10, marginBottom: 28,
        }}>
          Your account has been verified and is ready to use.
        </Text>

        <PrimaryButton title="Continue" onPress={onDone} style={{ alignSelf: "stretch" }} />
      </View>
    </View>
  );
}
