import { Text, View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useState } from "react";
import { handleLogin } from "../services/auth";
import useAuthStore from "../store/AuthStore.js";

const BLUE = '#2563eb';
const BLUE_LIGHT = '#dbeafe';
const BLUE_DARK = '#1e40af';

export default function Login({ onSignUpPress, onLoginSuccess, onClose }) {
    const login = useAuthStore((state) => state.login);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const onLoginPress = async () => {
        setError("");
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        const result = await handleLogin({ email, password });
        setLoading(false);
        if (result.ok) {
            login({ token: result.data.token });
            if (onLoginSuccess) onLoginSuccess();
        } else {
            setError(result.data.detail || "Login failed.");
        }
    };

    return (
        <ScrollView contentContainerStyle={{
            flexGrow: 1, justifyContent: "center", alignItems: "center",
            padding: 24
        }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={onClose} style={{ position: "absolute", top: 0, left: 0 }}>
                <Text style={{ fontSize: 24, color: BLUE }}>←</Text>
            </TouchableOpacity>

            <View style={{
                width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE_LIGHT,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16
            }}>
                <Text style={{ fontSize: 28 }}>👋</Text>
            </View>

            <Text style={{ fontSize: 28, fontWeight: "800", color: "#1e293b", marginBottom: 6, textAlign: 'center' }}>
                Welcome back
            </Text>
            <Text style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28, textAlign: 'center' }}>
                Sign in to your account
            </Text>

            {error ? (
                <View style={{
                    backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5",
                    borderRadius: 12, padding: 12, marginBottom: 20, width: "100%"
                }}>
                    <Text style={{ color: "#dc2626", fontSize: 14, fontWeight: "500", textAlign: 'center' }}>{error}</Text>
                </View>
            ) : null}

            <View style={{ width: "100%", marginBottom: 18 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 }}>Email</Text>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
                    borderRadius: 14, borderWidth: 2, borderColor: emailFocused ? BLUE : '#e2e8f0',
                    paddingHorizontal: 14, paddingVertical: 12
                }}>
                    <Text style={{ fontSize: 16, color: '#94a3b8', marginRight: 10 }}>✉️</Text>
                    <TextInput
                        style={{ flex: 1, fontSize: 16, color: "#1e293b", fontWeight: "500" }}
                        placeholder="your@email.com"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                    />
                    {email.includes('@') && email.includes('.') && (
                        <Text style={{ fontSize: 16, color: BLUE }}>✓</Text>
                    )}
                </View>
            </View>

            <View style={{ width: "100%", marginBottom: 32 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 }}>Password</Text>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
                    borderRadius: 14, borderWidth: 2, borderColor: passwordFocused ? BLUE : '#e2e8f0',
                    paddingHorizontal: 14, paddingVertical: 12
                }}>
                    <Text style={{ fontSize: 16, color: '#94a3b8', marginRight: 10 }}>🔒</Text>
                    <TextInput
                        style={{ flex: 1, fontSize: 16, color: "#1e293b", fontWeight: "500" }}
                        placeholder="••••••••"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                    />
                    {password.length >= 6 && (
                        <Text style={{ fontSize: 16, color: BLUE }}>✓</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={{
                    width: "100%", backgroundColor: loading ? "#94a3b8" : BLUE,
                    borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 24,
                    shadowColor: BLUE, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 },
                    shadowRadius: 16, elevation: 8
                }}
                onPress={onLoginPress}
                disabled={loading}
            >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17, letterSpacing: 0.5 }}>
                    {loading ? "Signing in..." : "Log in"}
                </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#64748b", fontSize: 15, fontWeight: "500", marginRight: 6 }}>
                    Don't have an account?
                </Text>
                <TouchableOpacity onPress={onSignUpPress}>
                    <Text style={{ color: BLUE, fontWeight: "700", fontSize: 15 }}>Sign up</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
