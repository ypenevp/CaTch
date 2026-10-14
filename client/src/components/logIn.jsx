import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView, Switch } from "react-native";
import { handleLogin } from "../services/auth";
import useAuthStore from "../store/AuthStore.js";
import { theme } from "../theme/theme";
import AuthHeader from "./AuthHeader";
import AuthInput from "./AuthInput";
import PrimaryButton from "./PrimaryButton";
import SocialButtons from "./SocialButtons";
import ErrorBox from "./ErrorBox";

export default function Login({ onSignUpPress, onLoginSuccess, onClose, onForgotPress }) {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false); // TODO: свържи със запазване на сесията
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      login(result.data);
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setError(result.data.detail || "Login failed.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to your CaTch account to monitor your health in real time."
        onBack={onClose}
      />

      <ErrorBox message={error} />

      <AuthInput
        label="Email"
        icon="mail-outline"
        placeholder="name@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <AuthInput
        label="Password"
        icon="lock-closed-outline"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        autoComplete="password"
        secure
      />

      <View style={{
        flexDirection: "row", alignItems: "end", gap: 12,
        justifyContent: "flex-end", marginBottom: 28,
      }}>
        {/* <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ false: "#CBD5E1", true: theme.primary }}
            thumbColor="#fff"
            style={{ transform: [{ scale: 0.8 }] }}
          />
          <Text style={{ fontFamily: theme.font.regular, fontSize: 14, color: theme.textMuted }}>
            Remember me
          </Text>
        </View> */}

        <TouchableOpacity onPress={onForgotPress} hitSlop={8}>
          <Text style={{ fontFamily: theme.font.medium, fontSize: 14, color: theme.primary }}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      </View>

      <PrimaryButton title="Log in" onPress={onLoginPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 24 }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: 15, color: theme.textMuted }}>
          Don't have an account?{" "}
        </Text>
        <TouchableOpacity onPress={onSignUpPress} hitSlop={8}>
          <Text style={{ fontFamily: theme.font.semibold, fontSize: 15, color: theme.primary }}>
            Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
