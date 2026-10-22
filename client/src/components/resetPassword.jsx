import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { handleForgotPassword, handleResetPassword } from "../services/auth";
import { theme } from "../theme/theme";
import AuthHeader from "./AuthHeader";
import AuthInput from "./AuthInput";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";
import CodeInput from "./CodeInput";

const CODE_LENGTH = 6;

export default function ResetPassword({ email, onBack, onSuccess }) {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onResetPress = async () => {
    setError("");
    setInfo("");
    if (code.length < CODE_LENGTH) {
      setError("Please enter the 6-digit reset code.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 20) {
      setError("Password must be between 8 and 20 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await handleResetPassword({ email, code, newPassword, confirmPassword });
    setLoading(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.data.detail || "Password reset failed.");
    }
  };

  const onResendPress = async () => {
    setError("");
    setInfo("");
    setResending(true);
    const result = await handleForgotPassword({ email });
    setResending(false);
    if (result.ok) {
      setCode("");
      setInfo("A new code was sent to your email.");
    } else {
      setError(result.data.detail || "Could not resend code.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        title="Reset password"
        subtitle={`Enter the 6-digit code we sent to ${email} and choose a new password.`}
        onBack={onBack}
      />

      <ErrorBox message={error} />

      {!!info && (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: theme.primarySoft, borderRadius: theme.radius,
          borderWidth: 1, borderColor: theme.primaryBorder,
          paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
        }}>
          <Text style={{ flex: 1, fontFamily: theme.font.medium, fontSize: 14, color: theme.primaryDark }}>
            {info}
          </Text>
        </View>
      )}

      <CodeInput value={code} onChangeText={setCode} length={CODE_LENGTH} />

      <AuthInput
        label="New password"
        icon="lock-closed-outline"
        placeholder="Create a new password"
        value={newPassword}
        onChangeText={setNewPassword}
        autoComplete="password-new"
        secure
      />
      <AuthInput
        label="Repeat new password"
        icon="lock-closed-outline"
        placeholder="Repeat your new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secure
      />

      <View style={{ height: 10 }} />
      <PrimaryButton title="Reset password" onPress={onResetPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 24 }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: 15, color: theme.textMuted }}>
          Didn't get the code?{" "}
        </Text>
        <TouchableOpacity onPress={onResendPress} disabled={resending} hitSlop={8}>
          <Text style={{
            fontFamily: theme.font.semibold, fontSize: 15,
            color: resending ? theme.placeholder : theme.primary,
          }}>
            {resending ? "Sending..." : "Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
