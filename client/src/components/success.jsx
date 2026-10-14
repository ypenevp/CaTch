import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/theme";
import PrimaryButton from "./PrimaryButton";

export default function Success({ onDone }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end",
    }}>
      <View style={{
        backgroundColor: theme.surface,
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, paddingTop: 36,
        paddingBottom: Math.max(insets.bottom, 16) + 8,
        alignItems: "center",
      }}>
        <View style={{
          width: 132, height: 132, borderRadius: 66,
          backgroundColor: "rgba(52, 167, 55, 0.12)",
          alignItems: "center", justifyContent: "center", marginBottom: 24,
        }}>
          <View style={{
            width: 106, height: 106, borderRadius: 53,
            backgroundColor: "rgba(52, 167, 55, 0.22)",
            alignItems: "center", justifyContent: "center",
          }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40, backgroundColor: "#34a737",
              alignItems: "center", justifyContent: "center",
              shadowColor: "#34a737", shadowOpacity: 0.4,
              shadowOffset: { width: 0, height: 8 }, shadowRadius: 14, elevation: 6,
            }}>
              <Ionicons name="checkmark" size={44} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={{ fontFamily: theme.font.semibold, fontSize: 28, color: theme.text }}>
          Account verified
        </Text>
        <Text style={{
          fontFamily: theme.font.regular, fontSize: 15, lineHeight: 22,
          color: theme.textMuted, textAlign: "center", marginTop: 10, marginBottom: 28,
        }}>
          Your account is ready. Log in to connect your bracelet and start monitoring.
        </Text>

        <PrimaryButton title="Continue" onPress={onDone} style={{ alignSelf: "stretch" }} />
      </View>
    </View>
  );
}