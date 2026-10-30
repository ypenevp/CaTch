import { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import AddDeviceForm from "@/components/AddDeviceForm";
import BraceletConnect from "@/components/BraceletConnect";
import WifiForm from "@/components/WifiForm";
import PairingStatus from "@/components/PairingStatus";
import { useBraceletProvisioning } from "@/hooks/useBraceletProvisioning";
import useAuthStore from "@/store/AuthStore";
import { theme } from "@/theme/theme";

export default function AddDevice() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => !!s.user);
  const { phase, error, isConnected, start, sendProvisioning, cancel, disconnect } = useBraceletProvisioning();

  const [step, setStep] = useState("form");
  const [deviceId, setDeviceId] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "" });
  const [pairing, setPairing] = useState(null);

  useEffect(() => {
    if (step === "connect" && phase === "confirmed") setStep("wifi");
    if (step === "wifi" && phase === "error" && !isConnected) setStep("connect");
  }, [step, phase, isConnected]);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const leave = async () => {
    await cancel();
    goHome();
  };

  const finish = async () => {
    await disconnect();
    goHome();
  };

  const handleDeviceIdSubmit = (id) => {
    setDeviceId(id);
    setStep("connect");
    start(id);
  };

  const handleWifiSubmit = ({ pairing: created, ssid, password }) => {
    setWifi({ ssid, password });
    setPairing(created);
    setStep("pairing");
    sendProvisioning({ token: created.pairingToken, ssid, password });
  };

  const retry = () => {
    setPairing(null);
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
        <AddDeviceForm initialDeviceId={deviceId} onBack={goHome} onSubmit={handleDeviceIdSubmit} />
      )}

      {step === "connect" && (
        <BraceletConnect deviceId={deviceId} phase={phase} error={error} onRetry={retry} onCancel={leave} />
      )}

      {step === "wifi" && (
        <WifiForm
          deviceId={deviceId}
          initialSsid={wifi.ssid}
          initialPassword={wifi.password}
          errorMessage={phase === "error" ? error?.message : null}
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
