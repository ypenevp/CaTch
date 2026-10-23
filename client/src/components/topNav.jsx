import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/AuthStore.js';
import useUIStore from '../store/UIStore.js';
import { theme } from '../theme/theme';
import Logo from './Logo';

const BAR_HEIGHT = 56;

const TopNav = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const authUser = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.isLoading);
    const logout = useAuthStore((state) => state.logout);
    const openLogin = useUIStore((state) => state.openLogin);
    const openSignup = useUIStore((state) => state.openSignup);

    const isLoggedIn = !!authUser;

    const handleLogout = async () => {
        await logout();
        router.replace('/');
    };

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View style={{
                width: '100%', height: BAR_HEIGHT + insets.top, paddingTop: insets.top,
                paddingHorizontal: theme.space.lg, backgroundColor: theme.surface,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                ...theme.shadow.bar, shadowOffset: { width: 0, height: 4 }, zIndex: 50,
            }}>
                <TouchableOpacity
                    onPress={() => router.push('/')}
                    activeOpacity={0.8}
                    accessibilityRole="link"
                    accessibilityLabel="Home"
                >
                    <Logo size={30} />
                </TouchableOpacity>

                {!isLoggedIn && !authLoading && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
                        <TouchableOpacity
                            onPress={openLogin}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            style={{ height: 40, paddingHorizontal: theme.space.md, justifyContent: 'center' }}
                        >
                            <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>Log in</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={openSignup}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            style={{
                                height: 40, paddingHorizontal: theme.space.lg, justifyContent: 'center',
                                borderRadius: 20, borderWidth: 1.5, borderColor: theme.primaryBorder,
                                backgroundColor: theme.surface,
                            }}
                        >
                            <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>Sign up</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isLoggedIn && (
                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.7}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Log out"
                        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="log-out-outline" size={26} color={theme.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
        </>
    );
};

export default TopNav;
