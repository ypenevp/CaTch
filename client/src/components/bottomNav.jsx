import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

const BLUE = '#2563eb';
const INACTIVE = '#94a3b8';
const RED = '#ef4444';
const BAR_HEIGHT = 70;

const TABS = [
    { name: 'Home', route: '', icon: 'home' },
    { name: 'Panic', route: 'Panic', icon: 'bell', badge: true },
];

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const currentRoute = pathname.replace(/^\//, '');

    const anims = useRef(TABS.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        TABS.forEach((tab, i) => {
            Animated.spring(anims[i], {
                toValue: tab.route === currentRoute ? 1 : 0,
                useNativeDriver: true,
                tension: 120,
                friction: 8,
            }).start();
        });
    }, [currentRoute]);

    return (
        <View style={{
            height: BAR_HEIGHT, flexDirection: 'row', backgroundColor: '#fff',
            borderTopWidth: 1, borderTopColor: '#e2e8f0', elevation: 8,
            shadowColor: '#000', shadowOpacity: 0.06,
            shadowOffset: { width: 0, height: -3 }, shadowRadius: 8,
        }}>
            {TABS.map((tab, i) => {
                const isActive = tab.route === currentRoute;
                const iconScale = anims[i].interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
                const dotScaleX = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
                const labelOpacity = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

                return (
                    <TouchableOpacity
                        key={tab.route}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
                        onPress={() => router.push('/' + tab.route)}
                        activeOpacity={0.7}
                    >
                        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                            <MaterialCommunityIcons name={tab.icon} size={26} color={isActive ? BLUE : INACTIVE} />
                            {tab.badge && (
                                <View style={{
                                    position: 'absolute', top: -3, right: -6, width: 15, height: 15,
                                    borderRadius: 8, backgroundColor: RED, alignItems: 'center',
                                    justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
                                }}>
                                    <MaterialCommunityIcons name="exclamation-thick" size={9} color="#fff" />
                                </View>
                            )}
                        </Animated.View>
                        <Animated.Text style={{
                            fontSize: 11, fontWeight: isActive ? '700' : '500',
                            marginTop: 2, color: isActive ? BLUE : INACTIVE, opacity: labelOpacity,
                        }}>
                            {tab.name}
                        </Animated.Text>
                        <Animated.View style={{
                            position: 'absolute', bottom: 6, width: 28, height: 3,
                            borderRadius: 2, backgroundColor: BLUE,
                            opacity: anims[i], transform: [{ scaleX: dotScaleX }],
                        }} />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
