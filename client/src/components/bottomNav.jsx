import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

const BAR_HEIGHT = 64;

const TABS = [
    { name: 'Home', route: '', icon: 'home-outline', activeIcon: 'home' },
    { name: 'Alerts', route: 'alerts', icon: 'bell-outline', activeIcon: 'bell' },
];

export default function BottomNav({ unreadAlerts = 0 }) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
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
            height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom,
            flexDirection: 'row', backgroundColor: theme.surface,
            borderTopWidth: 1, borderTopColor: theme.border,
            ...theme.shadow.bar, shadowOffset: { width: 0, height: -3 },
        }}>
            {TABS.map((tab, i) => {
                const isActive = tab.route === currentRoute;
                const color = isActive ? theme.primary : theme.textMuted;
                const showBadge = tab.route === 'alerts' && unreadAlerts > 0;
                const iconScale = anims[i].interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
                const indicatorScaleX = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

                return (
                    <TouchableOpacity
                        key={tab.route}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => router.push('/' + tab.route)}
                        activeOpacity={0.7}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.name}
                        accessibilityState={{ selected: isActive }}
                    >
                        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                            <MaterialCommunityIcons name={isActive ? tab.activeIcon : tab.icon} size={26} color={color} />
                            {showBadge && (
                                <View style={{
                                    position: 'absolute', top: -2, right: -4, width: 12, height: 12,
                                    borderRadius: 6, backgroundColor: theme.danger,
                                    borderWidth: 2, borderColor: theme.surface,
                                }} />
                            )}
                        </Animated.View>
                        <Animated.Text style={{
                            fontFamily: isActive ? theme.font.semibold : theme.font.medium,
                            fontSize: theme.size.xs, marginTop: 2, color,
                        }}>
                            {tab.name}
                        </Animated.Text>
                        <Animated.View style={{
                            position: 'absolute', top: 0, width: 32, height: 3,
                            borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
                            backgroundColor: theme.primary,
                            opacity: anims[i], transform: [{ scaleX: indicatorScaleX }],
                        }} />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
