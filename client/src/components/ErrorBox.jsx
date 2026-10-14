import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: theme.dangerSoft, borderRadius: 16,
      paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
    }}>
      <Ionicons name="alert-circle-outline" size={20} color={theme.danger} />
      <Text style={{
        flex: 1, fontFamily: theme.font.regular, fontSize: 14, color: theme.danger,
      }}>
        {message}
      </Text>
    </View>
  );
}
