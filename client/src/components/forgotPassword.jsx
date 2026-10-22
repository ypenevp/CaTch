import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { handleForgotPassword } from "../services/auth";
import { theme } from "../theme/theme";
import AuthHeader from "./AuthHeader";
import AuthInput from "./AuthInput";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";

export default function ForgotPassword({ onBack, onCodeSent }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSendPress = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    const result = await handleForgotPassword({ email: email.trim() });
    setLoading(false);
    if (result.ok) {
      onCodeSent(email.trim());
    } else {
      setError(result.data.detail || "Could not send reset code.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        title="Forgot password?"
        subtitle="Enter the email linked to your CaTch account and we'll send you a 6-digit reset code."
        onBack={onBack}
      />

      <ErrorBox message={error} />

      <AuthInput
        label="Email"
        icon="mail-outline"
        placeholder="name@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />

      <View style={{ height: 10 }} />
      <PrimaryButton title="Send code" onPress={onSendPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 24 }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: 15, color: theme.textMuted }}>
          Remember your password?{" "}
        </Text>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Text style={{ fontFamily: theme.font.semibold, fontSize: 15, color: theme.primary }}>
            Log in
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
