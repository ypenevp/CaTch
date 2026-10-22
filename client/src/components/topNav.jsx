import React, { useRef, useEffect } from 'react';
import {
    View, Text, Image, Animated, TouchableOpacity, StatusBar,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import useAuthStore from '../store/AuthStore.js';
import useUIStore from '../store/UIStore.js';

const BLUE = '#2563eb';

const TopNav = () => {
    const router = useRouter();
    const pathname = usePathname();

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
        router.push('/');
    };

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View style={{
                width: '100%', height: 110, backgroundColor: '#fff',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
                zIndex: 50, paddingBottom: 4, paddingTop: 50, overflow: 'visible',
            }}>
                <TouchableOpacity
                    onPress={() => router.push('/')}
                    activeOpacity={0.8}
                    style={{ paddingLeft: 4, paddingRight: 12 }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: BLUE, marginBottom: 6, marginLeft: 6 }}>
                                CaTch
                            </Text>
                            <Animated.View style={{
                                height: 2, width: '85%', borderRadius: 1,
                                backgroundColor: BLUE, marginTop: 2,
                                transform: [{ scaleX: homeAnim }],
                            }} />
                        </View>
                    </View>
                </TouchableOpacity>

                {!isLoggedIn && !authLoading && (
                    <View style={{
                        flexDirection: 'row', backgroundColor: '#f8fafc',
                        borderRadius: 15, overflow: 'hidden',
                        borderWidth: 2, borderColor: BLUE, marginBottom: 7, marginRight: 20,
                    }}>
                        <TouchableOpacity
                            onPress={openLogin}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: BLUE }}>Log In</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={openSignup}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: BLUE }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isLoggedIn && (
                    <View style={{ alignItems: 'center', gap: 4, marginRight: 20, marginBottom: 7 }}>
                        <TouchableOpacity
                            onPress={handleLogout}
                            activeOpacity={0.8}
                            style={{
                                paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ef4444',
                                borderRadius: 15, borderWidth: 2, borderColor: '#ef4444',
                            }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </>
    );
};

export default TopNav;
