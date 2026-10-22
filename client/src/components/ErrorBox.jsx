import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: theme.dangerSoft, borderRadius: theme.radius,
      borderWidth: 1, borderColor: theme.dangerBorder,
      paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
    }}>
      <Ionicons name="alert-circle-outline" size={20} color={theme.danger} />
      <Text style={{
        flex: 1, fontFamily: theme.font.medium, fontSize: 14, color: theme.danger,
      }}>
        {message}
      </Text>
    </View>
  );
}
