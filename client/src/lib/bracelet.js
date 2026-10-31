import { PermissionsAndroid, Platform } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { decodeBase64Utf8, encodeUtf8Base64 } from "@/utils/base64Utf8";

const SERVICE_UUID = "8117f76e-7648-4b23-93ad-8dc887232b00";
const DEVICE_INFO_UUID = "8117f76e-7648-4b23-93ad-8dc887232b01";
const STATUS_UUID = "8117f76e-7648-4b23-93ad-8dc887232b02";
const WIFI_CREDENTIALS_UUID = "8117f76e-7648-4b23-93ad-8dc887232b03";
const PAIRING_TOKEN_UUID = "8117f76e-7648-4b23-93ad-8dc887232b04";
const COMMAND_UUID = "8117f76e-7648-4b23-93ad-8dc887232b05";

const BLUETOOTH_STATE_TIMEOUT_MS = 8000;
const SCAN_TIMEOUT_MS = 30000;
const CONNECT_TIMEOUT_MS = 15000;
const CANCEL_WRITE_TIMEOUT_MS = 1500;
const DESIRED_MTU = 512;

export class BraceletError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BraceletError";
    this.code = code;
  }
}

let manager = null;
let activeScan = null;

function getManager() {
  if (!manager) {
    try {
      manager = new BleManager();
    } catch {
      throw new BraceletError("BLE_UNAVAILABLE", "Bluetooth needs the development build of the app.");
    }
  }
  return manager;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readText(device, characteristicUuid) {
  const characteristic = await device.readCharacteristicForService(SERVICE_UUID, characteristicUuid);
  return decodeBase64Utf8(characteristic.value);
}

function writeText(device, characteristicUuid, text) {
  return device.writeCharacteristicWithResponseForService(SERVICE_UUID, characteristicUuid, encodeUtf8Base64(text));
}

export async function ensureBlePermissions() {
  if (Platform.OS !== "android") return;

  const permissions = Platform.Version >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(permissions);
  const granted = permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
  if (!granted) throw new BraceletError("PERMISSION_DENIED", "Allow Bluetooth access to connect your bracelet.");
}

export function waitForBluetoothOn() {
  const ble = getManager();

  return new Promise((resolve, reject) => {
    let settled = false;
    let subscription = null;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      if (error) reject(error);
      else resolve();
    };

    const timer = setTimeout(
      () => finish(new BraceletError("BLUETOOTH_OFF", "Turn on Bluetooth and try again.")),
      BLUETOOTH_STATE_TIMEOUT_MS
    );

    subscription = ble.onStateChange((state) => {
      if (state === "PoweredOn") finish();
      else if (state === "Unsupported") finish(new BraceletError("BLE_UNSUPPORTED", "Bluetooth isn't available on this device."));
      else if (state === "Unauthorized") finish(new BraceletError("PERMISSION_DENIED", "Allow Bluetooth access to connect your bracelet."));
    }, true);

    if (settled) subscription.remove();
  });
}

export function scanForBracelet(deviceId) {
  const ble = getManager();
  const expectedName = `CaTch-${deviceId}`;
  stopScan();

  return new Promise((resolve, reject) => {
    const finish = (error, device) => {
      if (!activeScan || activeScan.reject !== reject) return;
      clearTimeout(activeScan.timer);
      activeScan = null;
      ble.stopDeviceScan();
      if (error) reject(error);
      else resolve(device);
    };

    activeScan = {
      reject,
      timer: setTimeout(
        () => finish(new BraceletError("NOT_FOUND", `Couldn't find ${expectedName}. Make sure it's on and close to your phone.`)),
        SCAN_TIMEOUT_MS
      ),
    };

    ble.startDeviceScan([SERVICE_UUID], null, (error, device) => {
      if (error) {
        finish(new BraceletError("SCAN_FAILED", error.message));
        return;
      }
      if ((device?.localName ?? device?.name) === expectedName) finish(null, device);
    });
  });
}

export function stopScan() {
  if (!activeScan) return;
  const { timer, reject } = activeScan;
  activeScan = null;
  clearTimeout(timer);
  manager?.stopDeviceScan();
  reject(new BraceletError("CANCELLED", "Scan cancelled."));
}

export async function connectToBracelet(scannedDevice, deviceId) {
  const device = await scannedDevice.connect({ requestMTU: DESIRED_MTU, timeout: CONNECT_TIMEOUT_MS });
  await device.discoverAllServicesAndCharacteristics();

  const info = parseJson(await readText(device, DEVICE_INFO_UUID));
  if (info?.deviceId !== deviceId) {
    await disconnectBracelet(device);
    throw new BraceletError("WRONG_DEVICE", "This bracelet doesn't match the ID you entered.");
  }
  return device;
}

export async function readBraceletStatus(device) {
  return parseJson(await readText(device, STATUS_UUID));
}

export function monitorBraceletStatus(device, onStatus) {
  return device.monitorCharacteristicForService(SERVICE_UUID, STATUS_UUID, (error, characteristic) => {
    if (error || !characteristic?.value) return;
    const status = parseJson(decodeBase64Utf8(characteristic.value));
    if (status) onStatus(status);
  });
}

export function onBraceletDisconnected(device, listener) {
  return device.onDisconnected(() => listener());
}

export async function sendBraceletProvisioning(device, { token, ssid, password }) {
  await writeText(device, PAIRING_TOKEN_UUID, token);
  await writeText(device, WIFI_CREDENTIALS_UUID, JSON.stringify({ ssid, password }));
  await writeText(device, COMMAND_UUID, "CONNECT");
}

export async function sendBraceletCancel(device) {
  const timeout = new Promise((resolve) => setTimeout(resolve, CANCEL_WRITE_TIMEOUT_MS));
  await Promise.race([writeText(device, COMMAND_UUID, "CANCEL").catch(() => {}), timeout]);
}

export async function disconnectBracelet(device) {
  await device.cancelConnection().catch(() => {});
}
