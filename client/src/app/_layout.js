import { Stack } from "expo-router";
import { View, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import BottomNav from "@/components/bottomNav";
import TopNav from "@/components/topNav";
import Login from "@/components/logIn";
import SignUp from "@/components/signUp";
import VerifyCode from "@/components/verify";
import Success from "@/components/success";
import { theme } from "../theme/theme";

import useUIStore from '../store/UIStore.js';

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  const isVisible = useUIStore((state) => state.modal !== null);
  const modal = useUIStore((state) => state.modal);
  const closeModal = useUIStore((state) => state.closeModal);
  const [screen, setScreen] = useState(null);
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    if (modal === 'login') setScreen('login');
    else if (modal === 'signup') setScreen('signup');
    else if (modal === 'verify') setScreen('verify');
    else if (modal === 'success') setScreen('success');
    else if (!modal && !screen?.match(/verify|success/)) setScreen(null);
  }, [modal]);

  const closeAll = () => {
    setScreen(null);
    closeModal();
  };

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav />

      <Modal
        visible={isVisible}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={closeAll}
      >
        {screen === 'success' ? (
          <Success onDone={closeAll} />
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              {screen === 'login' && (
                <Login
                  onSignUpPress={() => setScreen('signup')}
                  onLoginSuccess={closeAll}
                  onClose={closeAll}
                />
              )}
              {screen === 'signup' && (
                <SignUp
                  onLoginPress={() => setScreen('login')}
                  onClose={closeAll}
                  onShowVerify={(email) => {
                    setPendingEmail(email);
                    setScreen('verify');
                  }}
                />
              )}
              {screen === 'verify' && (
                <VerifyCode
                  email={pendingEmail}
                  onBack={() => setScreen('signup')}
                  onSuccess={() => setScreen('success')}
                />
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}
