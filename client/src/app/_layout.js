import { Stack } from "expo-router";
import { View, Modal, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useEffect } from "react";
import BottomNav from "@/components/bottomNav";
import TopNav from "@/components/topNav";
import Login from "@/components/logIn";
import SignUp from "@/components/signUp";
import VerifyCode from "@/components/verify";
import Success from "@/components/success";

import useUIStore from '../store/UIStore.js';

export default function Layout() {
  const isVisible = useUIStore((state) => state.modal !== null);
  const modal = useUIStore((state) => state.modal);
  const closeModal = useUIStore((state) => state.closeModal);
  const [screen, setScreen] = useState(null);

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

  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav />

      <Modal visible={isVisible} transparent animationType="slide" onRequestClose={closeAll}>
        <TouchableOpacity activeOpacity={1} onPress={closeAll}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 28,
                paddingBottom: 40,
              }}>
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
                  <VerifyCode email={pendingEmail} onSuccess={() => setScreen('success')} />
                )}
                {screen === 'success' && (
                  <Success onDone={closeAll} />
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}