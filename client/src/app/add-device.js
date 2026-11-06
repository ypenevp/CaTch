import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import AddDeviceForm from "@/components/AddDeviceForm";
import BraceletConnect from "@/components/BraceletConnect";
import WifiForm from "@/components/WifiForm";
import PairingStatus from "@/components/PairingStatus";
import { useBraceletProvisioning } from "@/hooks/useBraceletProvisioning";
import { useCancelPairing, useCreatePairing } from "@/hooks/useDevices";
import useAuthStore from "@/store/AuthStore";
import { theme } from "@/theme/theme";

// The bracelet still needs time to join Wi-Fi and claim itself with the token.
const MIN_PAIRING_TIME_LEFT_MS = 2 * 60 * 1000;

function isPairingUsable(pairing) {
  return !!pairing && new Date(pairing.expiresAt).getTime() - Date.now() > MIN_PAIRING_TIME_LEFT_MS;
}

export default function AddDevice() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const { phase, error, isConnected, start, sendProvisioning, cancel, disconnect } = useBraceletProvisioning();
  const createPairing = useCreatePairing();
  const { mutate: cancelPairing } = useCancelPairing();

  const [step, setStep] = useState("form");
  const [deviceId, setDeviceId] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "" });
  const [pairing, setPairing] = useState(null);

  // Before the "pairing" step this screen owns the pending pairing; after it PairingStatus does.
  const ownedPairingRef = useRef(null);
  ownedPairingRef.current = step !== "pairing" ? pairing : null;

  useEffect(() => () => {
    if (ownedPairingRef.current) cancelPairing(ownedPairingRef.current.pairingId);
  }, [cancelPairing]);

  useEffect(() => {
    if (step === "connect" && phase === "confirmed") setStep("wifi");
    if (step === "wifi" && phase === "error" && !isConnected) setStep("connect");
  }, [step, phase, isConnected]);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const releasePairing = () => {
    if (ownedPairingRef.current) cancelPairing(ownedPairingRef.current.pairingId);
    ownedPairingRef.current = null;
    setPairing(null);
  };

  const leave = async () => {
    releasePairing();
    await cancel();
    goHome();
  };

  const finish = async () => {
    await disconnect();
    goHome();
  };

  const handleDeviceIdSubmit = (id) => {
    createPairing.mutate(
      { deviceId: id },
      {
        onSuccess: (created) => {
          setDeviceId(id);
          setPairing(created);
          setStep("connect");
          start(id);
        },
      }
    );
  };

  const provision = (current, { ssid, password }) => {
    setWifi({ ssid, password });
    setPairing(current);
    setStep("pairing");
    sendProvisioning({ token: current.pairingToken, ssid, password });
  };

  const handleWifiSubmit = (credentials) => {
    if (isPairingUsable(pairing)) {
      provision(pairing, credentials);
      return;
    }
    releasePairing();
    createPairing.mutate({ deviceId }, { onSuccess: (created) => provision(created, credentials) });
  };

  const retry = () => {
    createPairing.reset();
    // PairingStatus cancels its pairing on unmount, so a new one is created on the Wi-Fi step.
    if (step === "pairing") setPairing(null);
    if (isConnected) {
      setStep("wifi");
      return;
    }
    setStep("connect");
    start(deviceId);
  };

  if (!isLoggedIn) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {step === "form" && (
        <AddDeviceForm
          initialDeviceId={deviceId}
          loading={createPairing.isPending}
          errorMessage={createPairing.error?.message}
          onBack={goHome}
          onSubmit={handleDeviceIdSubmit}
        />
      )}

      {step === "connect" && (
        <BraceletConnect deviceId={deviceId} phase={phase} error={error} onRetry={retry} onCancel={leave} />
      )}

      {step === "wifi" && (
        <WifiForm
          initialSsid={wifi.ssid}
          initialPassword={wifi.password}
          loading={createPairing.isPending}
          errorMessage={createPairing.error?.message || (phase === "error" ? error?.message : null)}
          onSubmit={handleWifiSubmit}
          onCancel={leave}
        />
      )}

      {step === "pairing" && pairing && (
        <PairingStatus
          key={pairing.pairingId}
          pairing={pairing}
          braceletPhase={phase}
          braceletError={phase === "error" ? error : null}
          onDone={finish}
          onLeave={leave}
          onRetry={retry}
        />
      )}
    </View>
  );
}
