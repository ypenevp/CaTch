import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { handleSignUp } from "../services/auth.js";
import { theme } from "../theme/theme.js";
import AuthHeader from "./AuthHeader";
import AuthInput from "./AuthInput";
import PrimaryButton from "./PrimaryButton";
import ErrorBox from "./ErrorBox";

export default function SignUp({ onLoginPress, onClose, onShowVerify }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignUpPress = async () => {
    setError("");
    const errors = {};
    const name = username.trim();
    if (!email.trim()) errors.email = "Enter your email.";
    if (!name) errors.username = "Choose a username.";
    else if (name.length < 2 || name.length > 30) errors.username = "Username must be 2–30 characters.";
    if (!password) errors.password = "Create a password.";
    else if (password.length < 8 || password.length > 20) errors.password = "Password must be 8–20 characters.";
    if (!repeatPassword) errors.repeatPassword = "Confirm your password.";
    else if (password !== repeatPassword) errors.repeatPassword = "Passwords do not match.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    const result = await handleSignUp({ email: email.trim(), username: name, password });
    setLoading(false);
    if (result.ok) {
      if (onShowVerify) onShowVerify(email.trim());
      else onLoginPress();
    } else {
      setError(result.data.detail || "Sign Up failed.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        title="Create your account"
        subtitle="Join CaTch to connect your bracelet and keep track of your health."
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
        label="Username"
        icon="person-outline"
        placeholder="Choose a username"
        value={username}
        onChangeText={setUsername}
        autoComplete="username-new"
        error={fieldErrors.username}
      />
      <AuthInput
        label="Password"
        icon="lock-closed-outline"
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        autoComplete="password-new"
        secure
        hint="8–20 characters"
        error={fieldErrors.password}
      />
      <AuthInput
        label="Confirm password"
        icon="lock-closed-outline"
        placeholder="Repeat your password"
        value={repeatPassword}
        onChangeText={setRepeatPassword}
        secure
        error={fieldErrors.repeatPassword}
      />

      <View style={{ height: theme.space.sm }} />
      <PrimaryButton title="Sign up" onPress={onSignUpPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: theme.space.xl }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.md, color: theme.textMuted }}>
          Already have an account?{" "}
        </Text>
        <TouchableOpacity onPress={onLoginPress} hitSlop={12} accessibilityRole="link">
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.primary }}>
            Log in
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
