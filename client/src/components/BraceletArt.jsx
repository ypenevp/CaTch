import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle, Polyline, Line } from 'react-native-svg';
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';

const Chip = ({ name, color, style, fa }) => {
    const Icon = fa ? FontAwesome6 : MaterialCommunityIcons;
    return (
        <View style={{
            position: 'absolute', width: 34, height: 34, borderRadius: 17,
            backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
            elevation: 4, shadowColor: '#1e3a8a', shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 3 }, shadowRadius: 6,
            ...style,
        }}>
            <Icon name={name} size={fa ? 16 : 19} color={color} />
        </View>
    );
};

export default function BraceletArt({ scale = 1 }) {
    const float = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(float, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
    const shadowScale = float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });
    const shadowOpacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.12] });

    return (
        <View style={{ width: 160 * scale, height: 190 * scale }}>
            <View style={{
                position: 'absolute', top: 0, left: 0, width: 160, height: 190,
                transform: [{ translateX: -80 * (1 - scale) }, { translateY: -95 * (1 - scale) }, { scale }],
            }}>
                <View style={{
                    position: 'absolute', top: 22, left: 15, width: 130, height: 130,
                    borderRadius: 65, backgroundColor: '#dbeafe',
                }} />

                <Animated.View style={{
                    position: 'absolute', bottom: 6, left: 40, width: 80, height: 12,
                    borderRadius: 6, backgroundColor: '#1e3a8a',
                    opacity: shadowOpacity, transform: [{ scaleX: shadowScale }],
                }} />

                <Animated.View style={{
                    position: 'absolute', top: 0, left: 0, width: 160, height: 175,
                    transform: [{ translateY }],
                }}>
                    <Svg
                        width={120} height={150} viewBox="0 0 120 150"
                        style={{ position: 'absolute', left: 20, top: 10, transform: [{ rotate: '-20deg' }] }}
                    >
                        <Defs>
                            <LinearGradient id="strap" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#60a5fa" />
                                <Stop offset="1" stopColor="#1d4ed8" />
                            </LinearGradient>
                            <LinearGradient id="body" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#334155" />
                                <Stop offset="1" stopColor="#0f172a" />
                            </LinearGradient>
                        </Defs>

                        <Path d="M42 16 Q60 8 78 16 L82 56 L38 56 Z" fill="url(#strap)" />
                        <Path d="M38 94 L82 94 L78 134 Q60 142 42 134 Z" fill="url(#strap)" />
                        <Line x1="60" y1="22" x2="60" y2="50" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="3 3" />
                        <Circle cx="60" cy="104" r="2.2" fill="#1e3a8a" />
                        <Circle cx="60" cy="114" r="2.2" fill="#1e3a8a" />
                        <Circle cx="60" cy="124" r="2.2" fill="#1e3a8a" />

                        <Rect x="91" y="62" width="5" height="13" rx="2.5" fill="#475569" />
                        <Rect x="28" y="44" width="64" height="62" rx="17" fill="url(#body)" />
                        <Rect x="34" y="50" width="52" height="50" rx="12" fill="#020617" />

                        <Path
                            d="M60 71 C51 65 49 58 54 55.5 C57 54 59.5 55.5 60 58 C60.5 55.5 63 54 66 55.5 C71 58 69 65 60 71 Z"
                            fill="#f43f5e"
                        />
                        <Polyline
                            points="40,86 48,86 52,77 58,94 63,82 67,86 80,86"
                            fill="none" stroke="#22d3ee" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                        />
                    </Svg>

                    <Chip name="heart-pulse" color="#f43f5e" style={{ right: 0, top: 14 }} />
                    <Chip name="creation" color="#8b5cf6" style={{ right: 40, top: -2 }} />
                    <Chip name="bell-alert" color="#ef4444" style={{ right: 0, top: 84 }} />
                    <Chip name="person-falling-burst" fa color="#14b8a6" style={{ left: 0, top: 44 }} />
                    <Chip name="shoe-print" color="#16a34a" style={{ left: 0, top: 104 }} />
                    <Chip name="water-percent" color="#0ea5e9" style={{ left: 30, top: 132 }} />
                </Animated.View>
            </View>
        </View>
    );
}
