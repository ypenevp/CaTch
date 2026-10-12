import { useEffect } from "react";
import { Text, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#2563eb';
const BLUE_LIGHT = '#dbeafe';

export default function Success({ onDone }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onDone) onDone();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <View style={{ width: "100%", alignItems: "center", justifyContent: "center", paddingVertical: 20 }}>
            <View style={{
                width: 80, height: 80, borderRadius: 40, backgroundColor: BLUE_LIGHT,
                alignItems: 'center', justifyContent: 'center', marginBottom: 20
            }}>
                <Ionicons name="checkmark-circle" size={50} color={BLUE} />
            </View>

            <Text style={{ fontSize: 28, fontWeight: "800", color: "#1e293b", textAlign: "center", marginBottom: 8 }}>
                You're all set!
            </Text>
            <Text style={{ fontSize: 15, color: "#94a3b8", textAlign: "center", lineHeight: 22 }}>
                Your account has been verified successfully.{'\n'}Redirecting you shortly…
            </Text>

            <View style={{
                marginTop: 28, width: 40, height: 4, borderRadius: 2, backgroundColor: BLUE_LIGHT
            }} />
        </View>
    );
}
