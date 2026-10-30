import { useState } from "react";
import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import AddDeviceForm from "@/components/AddDeviceForm";
import PairingStatus from "@/components/PairingStatus";
import useAuthStore from "@/store/AuthStore";
import { theme } from "@/theme/theme";

export default function AddDevice() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const [pairing, setPairing] = useState(null);
  const [lastDeviceId, setLastDeviceId] = useState("");

  const goHome = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const handlePairingCreated = (created) => {
    setLastDeviceId(created.deviceId);
    setPairing(created);
  };

  if (!isLoggedIn) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {pairing ? (
        <PairingStatus
          key={pairing.pairingId}
          pairing={pairing}
          onDone={goHome}
          onLeave={goHome}
          onRetry={() => setPairing(null)}
        />
      ) : (
        <AddDeviceForm
          initialDeviceId={lastDeviceId}
          onBack={goHome}
          onPairingCreated={handlePairingCreated}
        />
      )}
    </View>
  );
}
