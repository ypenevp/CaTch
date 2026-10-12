import { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { handleSignUp } from "../services/auth.js";

const BLUE = '#2563eb';
const BLUE_LIGHT = '#dbeafe';

export default function SignUp({ onLoginPress, onClose, onShowVerify }) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [usernameFocused, setUsernameFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [repeatPasswordFocused, setRepeatPasswordFocused] = useState(false);


    const onSignUpPress = async () => {
    setError("");
    if (!email || !username || !password || !repeatPassword) {
        setError("Please fill in all fields.");
        return;
    }
    if (password !== repeatPassword) {
        setError("Passwords do not match.");
        return;
    }
    setLoading(true);
    const result = await handleSignUp({ email, username, password });
    setLoading(false);
    if (result.ok) {
        if (onShowVerify) onShowVerify();
        else onLoginPress();
    } else {
        setError(result.data.detail || "Sign Up failed.");
    }
};

    const renderField = (icon, label, value, setValue, focused, setFocused, options = {}) => (
        <View style={{ width: "100%", marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 }}>{label}</Text>
            <View style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
                borderRadius: 14, borderWidth: 2, borderColor: focused ? BLUE : '#e2e8f0',
                paddingHorizontal: 14, paddingVertical: 12
            }}>
                <Text style={{ fontSize: 16, color: '#94a3b8', marginRight: 10 }}>{icon}</Text>
                <TextInput
                    style={{ flex: 1, fontSize: 16, color: "#1e293b", fontWeight: "500" }}
                    placeholder={options.placeholder || ''}
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={options.secure}
                    keyboardType={options.keyboard}
                    value={value}
                    onChangeText={setValue}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
                {options.valid && <Text style={{ fontSize: 16, color: BLUE }}>✓</Text>}
            </View>
        </View>
    );

    return (
        <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
            <View style={{ width: "100%", alignItems: "center", backgroundColor: "#fff", borderRadius: 24 }}>
                <TouchableOpacity onPress={onClose} style={{ position: "absolute", top: 0, left: 0 }}>
                    <Text style={{ fontSize: 24, color: BLUE }}>←</Text>
                </TouchableOpacity>

                <View style={{
                    width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE_LIGHT,
                    alignItems: 'center', justifyContent: 'center', marginBottom: 16
                }}>
                    <Text style={{ fontSize: 28 }}>🚀</Text>
                </View>

                <Text style={{ fontSize: 28, fontWeight: "800", color: "#1e293b", marginBottom: 6, textAlign: 'center' }}>
                    Create account
                </Text>
                <Text style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24, textAlign: 'center' }}>
                    Join us today
                </Text>

                {error ? (
                    <View style={{
                        backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5",
                        borderRadius: 12, padding: 12, marginBottom: 16, width: "100%"
                    }}>
                        <Text style={{ color: "#dc2626", fontSize: 14, fontWeight: "500", textAlign: 'center' }}>{error}</Text>
                    </View>
                ) : null}

                {renderField('✉️', 'Email', email, setEmail, emailFocused, setEmailFocused,
                    { placeholder: 'your@email.com', keyboard: 'email-address', valid: email.includes('@') && email.includes('.') })}

                {renderField('👤', 'Username', username, setUsername, usernameFocused, setUsernameFocused,
                    { placeholder: 'choose username', valid: username.length >= 3 })}

                {renderField('🔒', 'Password', password, setPassword, passwordFocused, setPasswordFocused,
                    { placeholder: '••••••••', secure: true, valid: password.length >= 6 })}

                {renderField('🔒', 'Repeat Password', repeatPassword, setRepeatPassword, repeatPasswordFocused, setRepeatPasswordFocused,
                    { placeholder: '••••••••', secure: true, valid: password && repeatPassword && password === repeatPassword })}


                <TouchableOpacity
                    style={{
                        width: "100%", backgroundColor: loading ? "#94a3b8" : BLUE,
                        borderRadius: 14, paddingVertical: 14, alignItems: "center",
                        marginTop: 8, marginBottom: 24,
                        shadowColor: BLUE, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 },
                        shadowRadius: 16, elevation: 8
                    }}
                    onPress={onSignUpPress}
                    disabled={loading}
                >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17, letterSpacing: 0.5 }}>
                        {loading ? "Signing up..." : "Sign up"}
                    </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#64748b", fontSize: 15, fontWeight: "500", marginRight: 6 }}>
                        Already have an account?
                    </Text>
                    <TouchableOpacity onPress={onLoginPress}>
                        <Text style={{ color: BLUE, fontWeight: "700", fontSize: 15 }}>Log in</Text>
                    </TouchableOpacity>
                </View>



            </View>
        </ScrollView>
    );
}
