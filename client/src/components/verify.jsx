import { useState } from "react";
import { ScrollView } from "react-native";
import { handleVerify } from "../services/auth";
import AuthHeader from "./AuthHeader";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";
import CodeInput from "./CodeInput";

const CODE_LENGTH = 6;

export default function VerifyCode({ onSuccess, onBack, email }) {
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

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

      <CodeInput value={code} onChangeText={setCode} length={CODE_LENGTH} autoFocus />

      <PrimaryButton title="Verify" onPress={onVerifyPress} loading={loading} />
    </ScrollView>
  );
}
