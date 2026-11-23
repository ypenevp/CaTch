import { Client, ReconnectionTimeMode } from "@stomp/stompjs";
import { refreshAccessToken } from "@/services/apiClient";
import useAuthStore from "@/store/AuthStore";

const WS_URL = `${(process.env.EXPO_PUBLIC_API_URL ?? "").replace(/^http/, "ws")}/ws`;
const AUTH_ERROR = "Authentication required";

const topics = new Map();
const statusListeners = new Set();
let connected = false;
let pendingRefresh = null;

function setConnected(value) {
  if (connected === value) return;
  connected = value;
  statusListeners.forEach((listener) => listener());
}

function deliver(destination, message) {
  let event;
  try {
    event = JSON.parse(message.body);
  } catch {
    return;
  }
  topics.get(destination)?.listeners.forEach((listener) => listener(event));
}

function subscribeTopic(destination, topic) {
  topic.subscription = client.subscribe(destination, (message) => deliver(destination, message));
}

const client = new Client({
  brokerURL: WS_URL,
  reconnectDelay: 1000,
  reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
  maxReconnectDelay: 30000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  forceBinaryWSFrames: true,
  appendMissingNULLonIncoming: true,
  beforeConnect: async () => {
    if (pendingRefresh) await pendingRefresh;
    const accessToken = useAuthStore.getState().user?.accessToken;
    if (!accessToken) {
      client.deactivate();
      return;
    }
    client.connectHeaders = { Authorization: `Bearer ${accessToken}` };
  },
  onConnect: () => {
    topics.forEach((topic, destination) => subscribeTopic(destination, topic));
    setConnected(true);
  },
  onWebSocketClose: () => {
    topics.forEach((topic) => {
      topic.subscription = null;
    });
    setConnected(false);
  },
  onStompError: (frame) => {
    if (frame.headers.message !== AUTH_ERROR || pendingRefresh) return;
    pendingRefresh = refreshAccessToken().finally(() => {
      pendingRefresh = null;
    });
  },
});

function subscribe(destination, listener) {
  let topic = topics.get(destination);
  if (!topic) {
    topic = { listeners: new Set(), subscription: null };
    topics.set(destination, topic);
    if (client.connected) subscribeTopic(destination, topic);
  }
  topic.listeners.add(listener);

  return () => {
    topic.listeners.delete(listener);
    if (topic.listeners.size || topics.get(destination) !== topic) return;
    topics.delete(destination);
    if (client.connected) topic.subscription?.unsubscribe();
  };
}

export const realtime = {
  connect: () => client.activate(),
  disconnect: () => client.deactivate(),
  subscribe,
  isConnected: () => connected,
  onStatusChange: (listener) => {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },
};

export const deviceTopic = (deviceId) => `/topic/devices/${deviceId}`;
export const userNotificationsTopic = (userId) => `/topic/users/${userId}/notifications`;
