import { useState } from "react";
import { ScrollView, View } from "react-native";
import { theme } from "@/theme/theme";
import AuthHeader from "@/components/AuthHeader";
import AuthInput from "@/components/AuthInput";
import PrimaryButton from "@/components/PrimaryButton";
import ErrorBox from "@/components/ErrorBox";
import { useCreatePairing } from "@/hooks/useDevices";

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function pairingErrorMessage(error) {
  if (!error) return null;
  if (error.status === 409) return "This bracelet already has an active pairing. Try again in a few minutes.";
  if (error.status === 404) return "No available bracelet with this ID. Check the ID and try again.";
  return error.message;
}

export default function AddDeviceForm({ initialDeviceId = "", onBack, onPairingCreated }) {
  const createPairing = useCreatePairing();
  const [deviceId, setDeviceId] = useState(initialDeviceId);
  const [fieldErrors, setFieldErrors] = useState({});

  const onSubmit = () => {
    const errors = {};
    const trimmedId = deviceId.trim();
    if (!trimmedId) errors.deviceId = "Enter the device ID.";
    else if (!DEVICE_ID_PATTERN.test(trimmedId)) errors.deviceId = "Use 8–64 letters, digits, - or _.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    createPairing.mutate(
      { deviceId: trimmedId },
      { onSuccess: (pairing) => onPairingCreated(pairing) }
    );
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

      <ErrorBox message={pairingErrorMessage(createPairing.error)} />

      <AuthInput
        label="Device ID"
        icon="barcode-outline"
        placeholder="Catch-00x"
        value={deviceId}
        onChangeText={setDeviceId}
        error={fieldErrors.deviceId}
        hint="Letters, digits, - or _"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <View style={{ height: theme.space.sm }} />
      <PrimaryButton title="Continue" onPress={onSubmit} loading={createPairing.isPending} />
    </ScrollView>
  );
}
