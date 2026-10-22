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
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSendPress = async () => {
    setError("");
    if (!email.trim()) {
      setFieldError("Enter your email.");
      return;
    }
    setFieldError("");
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
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl }}
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
        error={fieldError}
      />

      <View style={{ height: theme.space.sm }} />
      <PrimaryButton title="Send code" onPress={onSendPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: theme.space.xl }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.md, color: theme.textMuted }}>
          Remember your password?{" "}
        </Text>
        <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="link">
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.primary }}>
            Log in
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
