import { useState } from "react";
import { ScrollView, View } from "react-native";
import { theme } from "@/theme/theme";
import AuthHeader from "@/components/AuthHeader";
import AuthInput from "@/components/AuthInput";
import PrimaryButton from "@/components/PrimaryButton";

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export default function AddDeviceForm({ initialDeviceId = "", onBack, onSubmit }) {
  const [deviceId, setDeviceId] = useState(initialDeviceId);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = () => {
    const errors = {};
    const trimmedId = deviceId.trim();
    if (!trimmedId) errors.deviceId = "Enter the device ID.";
    else if (!DEVICE_ID_PATTERN.test(trimmedId)) errors.deviceId = "Use 8–64 letters, digits, - or _.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    onSubmit(trimmedId);
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        icon="watch-outline"
        title="Add a device"
        subtitle="Enter the ID printed on your bracelet or its box."
        onBack={onBack}
      />

      <AuthInput
        label="Device ID"
        icon="barcode-outline"
        placeholder="Catch-00x"
        value={deviceId}
        onChangeText={setDeviceId}
        error={fieldErrors.deviceId}
        hint="Letters, digits, - or _"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      <View style={{ height: theme.space.sm }} />
      <PrimaryButton title="Continue" onPress={handleSubmit} />
    </ScrollView>
  );
}
