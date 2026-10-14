import { useState } from "react";
import { Text, View, TextInput, ScrollView } from "react-native";
import { handleVerify } from "../services/auth";
import { theme } from "../theme/theme";
import AuthHeader from "./AuthHeader";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";

const CODE_LENGTH = 6;

export default function VerifyCode({ onSuccess, onBack, email }) {
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const onVerifyPress = async () => {
    setError("");
    if (code.length < CODE_LENGTH) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
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
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
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

      <View style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const isActive = focused && i === Math.min(code.length, CODE_LENGTH - 1);
            const isFilled = !!code[i];
            return (
              <View
                key={i}
                style={{
                  flex: 1, height: 62, borderRadius: theme.radius,
                  backgroundColor: isFilled ? theme.primarySoft : theme.surface,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: isActive
                    ? theme.primary
                    : isFilled ? theme.primaryBorder : theme.border,
                  shadowColor: theme.primary, shadowOpacity: isActive ? 0.18 : 0,
                  shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
                }}
              >
                <Text style={{
                  fontFamily: theme.font.semibold, fontSize: 24,
                  color: theme.primaryDark,
                }}>
                  {code[i] ?? ""}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Невидим input върху кутийките – хваща докосването и клавиатурата */}
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          caretHidden
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
        />
      </View>

      <PrimaryButton title="Verify" onPress={onVerifyPress} loading={loading} />
    </ScrollView>
  );
}
