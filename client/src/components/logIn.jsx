import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { handleLogin } from "../services/auth";
import useAuthStore from "../store/AuthStore.js";
import { theme } from "../theme/theme";
import AuthHeader from "./AuthHeader";
import AuthInput from "./AuthInput";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";

export default function Login({ onSignUpPress, onLoginSuccess, onClose, onForgotPress }) {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onLoginPress = async () => {
    setError("");
    const errors = {};
    if (!email.trim()) errors.email = "Enter your email.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    const result = await handleLogin({ email: email.trim(), password });
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
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to your CaTch account to monitor your health in real time."
        onClose={onClose}
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
        error={fieldErrors.email}
      />
      <AuthInput
        label="Password"
        icon="lock-closed-outline"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        autoComplete="password"
        secure
        error={fieldErrors.password}
      />

      <View style={{ alignItems: "flex-end", marginBottom: theme.space.xl }}>
        <TouchableOpacity onPress={onForgotPress} hitSlop={12} accessibilityRole="link">
          <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.sm, color: theme.primary }}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      </View>

      <PrimaryButton title="Log in" onPress={onLoginPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: theme.space.xl }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.md, color: theme.textMuted }}>
          Don't have an account?{" "}
        </Text>
        <TouchableOpacity onPress={onSignUpPress} hitSlop={12} accessibilityRole="link">
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.primary }}>
            Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
