import React, { useRef, useEffect } from 'react';
import {
    View, Text, Animated, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/AuthStore.js';
import useUIStore from '../store/UIStore.js';
import { theme } from '../theme/theme';

const BAR_HEIGHT = 56;

const TopNav = () => {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const authUser = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.isLoading);
    const logout = useAuthStore((state) => state.logout);
    const openLogin = useUIStore((state) => state.openLogin);
    const openSignup = useUIStore((state) => state.openSignup);

    const isLoggedIn = !!authUser;
    const isHome = pathname === '/';
    const homeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(homeAnim, {
            toValue: isHome ? 1 : 0,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
        }).start();
    }, [isHome]);

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
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xl, color: theme.primary }}>
                            CaTch
                        </Text>
                        <Animated.View style={{
                            height: 2, width: '100%', borderRadius: 1,
                            backgroundColor: theme.primary, marginTop: 4,
                            transform: [{ scaleX: homeAnim }],
                        }} />
                    </View>
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
                                borderRadius: 20, backgroundColor: theme.primary,
                            }}
                        >
                            <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.onPrimary }}>Sign up</Text>
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
