import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/theme";
import PrimaryButton from "./PrimaryButton";

export default function Success({
  onDone,
  title = "Account verified",
  subtitle = "Your account is ready. Log in to connect your bracelet and start monitoring.",
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end",
    }}>
      <View style={{
        backgroundColor: theme.surface,
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: theme.space.xl, paddingTop: theme.space.xxl,
        paddingBottom: Math.max(insets.bottom, theme.space.lg) + theme.space.sm,
        alignItems: "center",
      }}>
        <View style={{
          width: 132, height: 132, borderRadius: 66,
          backgroundColor: theme.successSoft,
          alignItems: "center", justifyContent: "center", marginBottom: theme.space.xl,
        }}>
          <View style={{
            width: 106, height: 106, borderRadius: 53,
            backgroundColor: theme.successTint,
            alignItems: "center", justifyContent: "center",
          }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40, backgroundColor: theme.success,
              alignItems: "center", justifyContent: "center",
              shadowColor: theme.success, shadowOpacity: 0.4,
              shadowOffset: { width: 0, height: 8 }, shadowRadius: 14, elevation: 6,
            }}>
              <Ionicons name="checkmark" size={44} color={theme.onPrimary} />
            </View>
          </View>
        </View>

        <Text
          accessibilityRole="header"
          style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xxl, color: theme.text, textAlign: "center" }}
        >
          {title}
        </Text>
        <Text style={{
          fontFamily: theme.font.regular, fontSize: theme.size.md, lineHeight: 24,
          color: theme.textMuted, textAlign: "center", marginTop: theme.space.sm, marginBottom: theme.space.xl,
        }}>
          {subtitle}
        </Text>

        <PrimaryButton title="Continue" onPress={onDone} style={{ alignSelf: "stretch" }} />
      </View>
    </View>
  );
}
