import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BraceletArt from "@/components/BraceletArt";

const BLUE = "#2563eb";
const BLUE_LIGHT = "#eff6ff";
const GREEN = "#16a34a";
const GRAY = "#94a3b8";
const ORANGE = "#f97316";
const ORANGE_DARK = "#c2410c";

const MOCK_USER = {
  username: "ivan_petrov",
  role: "USER",
};

const MOCK_DEVICES = [
  { id: "1", name: "Device #1", online: true},
  { id: "2", name: "Device #2", online: true},
  { id: "3", name: "Device #3", online: false},
];

function AddDeviceSection({ onPress }) {
  return (
    <View style={{
      backgroundColor: "#fff", padding: 16, elevation: 3,
      shadowColor: "#1e3a8a", shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BraceletArt scale={0.85} />

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a" }}>
            Track your health with a smart bracelet
          </Text>
          <Text style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 19 }}>
            Pulse, blood oxygen, fall detection, and more. Connect your bracelet to the app to monitor your health in real-time.
          </Text>

          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
              height: 48, borderRadius: 4, backgroundColor: ORANGE, marginTop: 14,
              borderBottomWidth: 4, borderBottomColor: ORANGE_DARK,
              elevation: 6, shadowColor: ORANGE, shadowOpacity: 0.4,
              shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, borderRadius: 12,
            }}
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Add Device</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DeviceItem({ device }) {
  const statusColor = device.online ? GREEN : GRAY;

  return (
    <View style={{
      flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 14, marginBottom: 10, gap: 12, elevation: 1,
      shadowColor: "#000", shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, borderRadius: 12,
    }}>
      <View style={{
        width: 46, height: 46, borderRadius: 12, backgroundColor: BLUE_LIGHT,
        alignItems: "center", justifyContent: "center",
      }}>
        <MaterialCommunityIcons name="watch-variant" size={26} color={BLUE} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>{device.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: statusColor }}>
            {device.online ? "Online" : "Offline"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AccountCard({ user }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, gap: 14, elevation: 2,
      shadowColor: "#000", shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE,
        alignItems: "center", justifyContent: "center",
      }}>
        <MaterialCommunityIcons name="account" size={32} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: GRAY, fontWeight: "600", textTransform: "uppercase" }}>
          Account
        </Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a", marginTop: 2 }}>
          {user.username}
        </Text>
        {/* <View style={{
          alignSelf: "flex-start", backgroundColor: BLUE_LIGHT, borderRadius: 10,
          paddingHorizontal: 10, paddingVertical: 3, marginTop: 6,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: BLUE }}>{user.role}</Text>
        </View> */}
      </View>
    </View>
  );
}

export default function Home() {
  const handleAddDevice = () => {};

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
    >
      <AddDeviceSection onPress={handleAddDevice} />

      <View style={{
        flexDirection: "row", alignItems: "center",
        marginTop: 24, marginBottom: 10,
      }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>
          Connected Devices
        </Text>
        <Text style={{
          fontSize: 13, fontWeight: "700", color: BLUE, backgroundColor: BLUE_LIGHT,
          borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8,
        }}>
          {MOCK_DEVICES.length}
        </Text>
      </View>

      {MOCK_DEVICES.map((device) => (
        <DeviceItem key={device.id} device={device} />
      ))}

      <View style={{ marginTop: 14 }}>
        <AccountCard user={MOCK_USER} />
      </View>
    </ScrollView>
  );
}
