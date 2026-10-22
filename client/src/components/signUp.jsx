import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { handleSignUp } from "../services/auth.js";
import { theme } from "../theme/theme.js";
import AuthHeader from "./AuthHeader";
import AuthInput from "./AuthInput";
import PrimaryButton from "./PrimaryButton";
import SocialButtons from "./SocialButtons";
import ErrorBox from "./ErrorBox";

export default function SignUp({ onLoginPress, onClose, onShowVerify }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (onShowVerify) onShowVerify(email);
      else onLoginPress();
    } else {
      setError(result.data.detail || "Sign Up failed.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AuthHeader
        title="Create your account"
        subtitle="Join CaTch to connect your bracelet and keep track of your health."
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
        label="Username"
        icon="person-outline"
        placeholder="Choose a username"
        value={username}
        onChangeText={setUsername}
        autoComplete="username-new"
      />
      <AuthInput
        label="Password"
        icon="lock-closed-outline"
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        secure
      />
      <AuthInput
        label="Repeat password"
        icon="lock-closed-outline"
        placeholder="Repeat your password"
        value={repeatPassword}
        onChangeText={setRepeatPassword}
        secure
      />

      <View style={{ height: 10 }} />
      <PrimaryButton title="Sign up" onPress={onSignUpPress} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 24 }}>
        <Text style={{ fontFamily: theme.font.regular, fontSize: 15, color: theme.textMuted }}>
          Already have an account?{" "}
        </Text>
        <TouchableOpacity onPress={onLoginPress} hitSlop={8}>
          <Text style={{ fontFamily: theme.font.semibold, fontSize: 15, color: theme.primary }}>
            Log in
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
