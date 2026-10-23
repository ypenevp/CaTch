import { useState, useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { handleVerify, handleResendCode } from "../services/auth";
import { theme } from "../theme/theme";
import AuthHeader from "./AuthHeader";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";
import Banner from "./Banner";
import CodeInput from "./CodeInput";

const CODE_LENGTH = 6;
const RESEND_TIMEOUT = 60;

export default function VerifyCode({ onSuccess, onBack, email }) {
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [codeError, setCodeError] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_TIMEOUT);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onResendPress = async () => {
    setError("");
    setInfo("");
    setResending(true);
    const result = await handleResendCode({ email });
    setResending(false);
    if (result.ok) {
      setCode("");
      setCodeError("");
      setInfo(result.data.detail);
      setCooldown(RESEND_TIMEOUT);
    } else {
      const seconds = result.status === 429 && result.data.detail.match(/(\d+) seconds/);
      if (seconds) setCooldown(Number(seconds[1]));
      setError(result.data.detail || "Could not resend code.");
    }
  };

  const onVerifyPress = async () => {
    setError("");
    if (code.length < CODE_LENGTH) {
      setCodeError("Enter all 6 digits.");
      return;
    }
    setCodeError("");
    if (!email) {
      setError("Email is required for verification.");
      return;
    }
    setLoading(true);
    const result = await handleVerify({ code, email });
    setLoading(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.data.detail || "Wrong code.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        icon="mail-unread-outline"
        title="Verify your email"
        subtitle={email
          ? `We sent a 6-digit code to ${email}. Enter it below to continue.`
          : "We sent a 6-digit code to your email. Enter it below to continue."}
        onBack={onBack}
      />

      <ErrorBox message={error} />
      <Banner message={info} variant="success" />

      <CodeInput value={code} onChangeText={setCode} length={CODE_LENGTH} autoFocus error={codeError} />

      <PrimaryButton title="Verify" onPress={onVerifyPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: theme.space.xl }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.md, color: theme.textMuted }}>
          Didn't get the code?{" "}
        </Text>
        <TouchableOpacity
          onPress={onResendPress}
          disabled={resending || cooldown > 0}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: theme.font.semibold, fontSize: theme.size.md,
            color: resending || cooldown > 0 ? theme.textMuted : theme.primary,
          }}>
            {resending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
