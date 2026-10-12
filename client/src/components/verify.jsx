import { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { handleVerify } from "../services/auth";

const BLUE = '#2563eb';
const BLUE_LIGHT = '#dbeafe';

export default function VerifyCode({ onSuccess }) {
    const [error, setError] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);

    const onVerifyPress = async () => {
        setError("");
        if (!code) {
            setError("Please enter the verification code.");
            return;
        }
        setLoading(true);
        const result = await handleVerify({ code });
        setLoading(false);
        if (result.ok) {
            onSuccess();
        } else {
            setError(result.data.detail || "Wrong code.");
        }
    };

    return (
        <ScrollView contentContainerStyle={{
            flexGrow: 1, justifyContent: "center", alignItems: "center",
            padding: 24
        }} showsVerticalScrollIndicator={false}>
            <View style={{
                width: 64, height: 64, borderRadius: 32, backgroundColor: BLUE_LIGHT,
                alignItems: 'center', justifyContent: 'center', marginBottom: 20
            }}>
                <Text style={{ fontSize: 32 }}>📩</Text>
            </View>

            <Text style={{ fontSize: 26, fontWeight: "800", color: "#1e293b", marginBottom: 8, textAlign: 'center' }}>
                Check your email
            </Text>
            <Text style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28, textAlign: 'center', lineHeight: 20 }}>
                We've sent a verification code to your email.{'\n'}Enter it below to continue.
            </Text>

            {error ? (
                <View style={{
                    backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5",
                    borderRadius: 12, padding: 12, marginBottom: 16, width: "100%"
                }}>
                    <Text style={{ color: "#dc2626", fontSize: 14, fontWeight: "500", textAlign: 'center' }}>{error}</Text>
                </View>
            ) : null}

            <View style={{ width: "100%", marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 }}>Verification Code</Text>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
                    borderRadius: 14, borderWidth: 2, borderColor: focused ? BLUE : '#e2e8f0',
                    paddingHorizontal: 14, paddingVertical: 14
                }}>
                    <Text style={{ fontSize: 18, color: '#94a3b8', marginRight: 10 }}>🔑</Text>
                    <TextInput
                        style={{ flex: 1, fontSize: 20, color: "#1e293b", fontWeight: "600", letterSpacing: 4, textAlign: 'center' }}
                        placeholder="000000"
                        placeholderTextColor="#cbd5e1"
                        value={code}
                        onChangeText={setCode}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        maxLength={6}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={{
                    width: "100%", backgroundColor: loading ? "#94a3b8" : BLUE,
                    borderRadius: 14, paddingVertical: 14, alignItems: "center",
                    shadowColor: BLUE, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 },
                    shadowRadius: 16, elevation: 8
                }}
                onPress={onVerifyPress}
                disabled={loading}
            >
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                    {loading ? "Verifying..." : "Verify"}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
