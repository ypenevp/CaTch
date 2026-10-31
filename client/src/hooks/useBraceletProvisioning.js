import { useCallback, useEffect, useRef, useState } from "react";
import {
  BraceletError,
  connectToBracelet,
  disconnectBracelet,
  ensureBlePermissions,
  monitorBraceletStatus,
  onBraceletDisconnected,
  readBraceletStatus,
  scanForBracelet,
  sendBraceletCancel,
  sendBraceletProvisioning,
  stopScan,
  waitForBluetoothOn,
} from "@/lib/bracelet";

const STATE_TO_PHASE = {
  WAITING_CONFIRMATION: "waitingConfirmation",
  CONFIRMED: "confirmed",
  WIFI_CONNECTING: "wifiConnecting",
  CLAIMING: "claiming",
  DONE: "done",
};

const ERROR_MESSAGES = {
  CONFIRM_TIMEOUT: "The button on the bracelet wasn't pressed in time.",
  MISSING_INPUT: "The bracelet didn't receive the setup data. Try again.",
  WIFI_NOT_FOUND: "The bracelet couldn't find this Wi-Fi network. It works only with 2.4 GHz networks.",
  WIFI_AUTH_FAILED: "Wrong Wi-Fi password.",
  WIFI_TIMEOUT: "The bracelet couldn't join the Wi-Fi network. Check the password and make sure it's a 2.4 GHz network.",
  CLAIM_NETWORK: "The bracelet can't reach the CaTch server.",
  DISCONNECTED: "The bracelet disconnected. Make sure it's on and close to your phone.",
  WRITE_FAILED: "Couldn't send the setup data. Accept the pairing request on your phone and try again.",
  SCAN_FAILED: "Bluetooth scan failed. Try again.",
  BLE_ERROR: "Couldn't connect to the bracelet. Try again.",
};

function braceletErrorMessage(code, message) {
  if (code === "CLAIM_REJECTED") return message || "The server rejected the bracelet.";
  return ERROR_MESSAGES[code] ?? message ?? ERROR_MESSAGES.BLE_ERROR;
}

export function useBraceletProvisioning() {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const phaseRef = useRef("idle");
  const runRef = useRef(0);
  const deviceRef = useRef(null);
  const subscriptionsRef = useRef([]);

  const updatePhase = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const fail = useCallback((code, message) => {
    setError({ code, message: braceletErrorMessage(code, message) });
    updatePhase("error");
  }, [updatePhase]);

  const release = useCallback(async ({ notifyBracelet = false } = {}) => {
    runRef.current += 1;
    stopScan();
    subscriptionsRef.current.forEach((subscription) => subscription.remove());
    subscriptionsRef.current = [];

    const device = deviceRef.current;
    deviceRef.current = null;
    setIsConnected(false);
    if (!device) return;

    if (notifyBracelet) await sendBraceletCancel(device);
    await disconnectBracelet(device);
  }, []);

  useEffect(() => () => {
    release({ notifyBracelet: phaseRef.current !== "done" });
  }, [release]);

  const start = useCallback(async (deviceId) => {
    await release();
    const run = runRef.current;
    const isStale = () => run !== runRef.current;

    setError(null);
    try {
      updatePhase("permission");
      await ensureBlePermissions();
      if (isStale()) return;

      updatePhase("bluetooth");
      await waitForBluetoothOn();
      if (isStale()) return;

      updatePhase("scanning");
      const scanned = await scanForBracelet(deviceId);
      if (isStale()) return;

      updatePhase("connecting");
      const device = await connectToBracelet(scanned, deviceId);
      if (isStale()) {
        disconnectBracelet(device);
        return;
      }

      deviceRef.current = device;
      setIsConnected(true);

      const handleStatus = ({ state, error: code, message }) => {
        if (isStale()) return;
        if (state === "ERROR") fail(code, message);
        else if (STATE_TO_PHASE[state]) updatePhase(STATE_TO_PHASE[state]);
      };

      subscriptionsRef.current.push(
        monitorBraceletStatus(device, handleStatus),
        onBraceletDisconnected(device, () => {
          if (isStale()) return;
          deviceRef.current = null;
          setIsConnected(false);
          if (phaseRef.current !== "done" && phaseRef.current !== "error") fail("DISCONNECTED");
        })
      );

      const current = await readBraceletStatus(device);
      if (current) handleStatus(current);
    } catch (e) {
      if (isStale()) return;
      fail(e instanceof BraceletError ? e.code : "BLE_ERROR", e instanceof BraceletError ? e.message : null);
    }
  }, [release, updatePhase, fail]);

  const sendProvisioning = useCallback(async ({ token, ssid, password }) => {
    const device = deviceRef.current;
    if (!device) {
      fail("DISCONNECTED");
      return;
    }

    setError(null);
    updatePhase("sending");
    try {
      await sendBraceletProvisioning(device, { token, ssid, password });
    } catch {
      if (deviceRef.current === device) fail("WRITE_FAILED");
    }
  }, [fail, updatePhase]);

  const cancel = useCallback(async () => {
    await release({ notifyBracelet: true });
    setError(null);
    updatePhase("idle");
  }, [release, updatePhase]);

  const disconnect = useCallback(() => release(), [release]);

  return { phase, error, isConnected, start, sendProvisioning, cancel, disconnect };
}
