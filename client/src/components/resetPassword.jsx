import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { handleForgotPassword, handleResetPassword } from "../services/auth";
import { theme } from "../theme/theme";
import AuthHeader from "./AuthHeader";
import AuthInput from "./AuthInput";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";
import Banner from "./Banner";
import CodeInput from "./CodeInput";

const CODE_LENGTH = 6;

export default function ResetPassword({ email, onBack, onSuccess }) {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onResetPress = async () => {
    setError("");
    setInfo("");
    const errors = {};
    if (code.length < CODE_LENGTH) errors.code = "Enter all 6 digits.";
    if (!newPassword) errors.newPassword = "Create a new password.";
    else if (newPassword.length < 8 || newPassword.length > 20) errors.newPassword = "Password must be 8–20 characters.";
    if (!confirmPassword) errors.confirmPassword = "Confirm your new password.";
    else if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

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
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        title="Reset password"
        subtitle={`Enter the 6-digit code we sent to ${email} and choose a new password.`}
        onBack={onBack}
      />

      <ErrorBox message={error} />
      <Banner message={info} variant="success" />

      <CodeInput value={code} onChangeText={setCode} length={CODE_LENGTH} error={fieldErrors.code} />

      <AuthInput
        label="New password"
        icon="lock-closed-outline"
        placeholder="Create a new password"
        value={newPassword}
        onChangeText={setNewPassword}
        autoComplete="password-new"
        secure
        hint="8–20 characters"
        error={fieldErrors.newPassword}
      />
      <AuthInput
        label="Confirm new password"
        icon="lock-closed-outline"
        placeholder="Repeat your new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secure
        error={fieldErrors.confirmPassword}
      />

      <View style={{ height: theme.space.sm }} />
      <PrimaryButton title="Reset password" onPress={onResetPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: theme.space.xl }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.md, color: theme.textMuted }}>
          Didn't get the code?{" "}
        </Text>
        <TouchableOpacity onPress={onResendPress} disabled={resending} hitSlop={12} accessibilityRole="button">
          <Text style={{
            fontFamily: theme.font.semibold, fontSize: theme.size.md,
            color: resending ? theme.textMuted : theme.primary,
          }}>
            {resending ? "Sending..." : "Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
