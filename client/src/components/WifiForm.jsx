import { useState } from "react";
import { ScrollView, View } from "react-native";
import { theme } from "@/theme/theme";
import AuthHeader from "@/components/AuthHeader";
import AuthInput from "@/components/AuthInput";
import PrimaryButton from "@/components/PrimaryButton";
import ErrorBox from "@/components/ErrorBox";
import CancelButton from "@/components/CancelButton";
import { utf8ByteLength } from "@/utils/base64Utf8";

export default function WifiForm({ initialSsid = "", initialPassword = "", loading = false, errorMessage, onSubmit, onCancel }) {
  const [ssid, setSsid] = useState(initialSsid);
  const [password, setPassword] = useState(initialPassword);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = () => {
    const errors = {};
    if (!ssid.trim()) errors.ssid = "Enter the Wi-Fi network name.";
    else if (utf8ByteLength(ssid) > 32) errors.ssid = "Network name must be at most 32 bytes.";
    if (password.length > 0 && password.length < 8) errors.password = "Wi-Fi passwords are at least 8 characters.";
    else if (utf8ByteLength(password) > 63) errors.password = "Password must be at most 63 characters.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    onSubmit({ ssid, password });
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        icon="wifi"
        title="Connect to Wi-Fi"
        subtitle="Your bracelet needs Wi-Fi to reach CaTch. Only 2.4 GHz networks are supported."
        onBack={onCancel}
      />

      <ErrorBox message={errorMessage} />

      <AuthInput
        label="Network name"
        icon="wifi-outline"
        placeholder="My home Wi-Fi"
        value={ssid}
        onChangeText={setSsid}
        error={fieldErrors.ssid}
        returnKeyType="next"
      />
      <AuthInput
        label="Password"
        icon="lock-closed-outline"
        placeholder="Wi-Fi password"
        value={password}
        onChangeText={setPassword}
        secure
        error={fieldErrors.password}
        hint="Leave empty for an open network"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <View style={{ height: theme.space.sm }} />
      <PrimaryButton title="Connect" onPress={handleSubmit} loading={loading} />
      <CancelButton onPress={onCancel} />
    </ScrollView>
  );
}
