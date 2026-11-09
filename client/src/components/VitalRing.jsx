import { useEffect, useId, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { theme } from "@/theme/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SWEEP = 270;
const STROKE = 9;
const R = 50 - STROKE / 2 - 2;
const C = 2 * Math.PI * R;
const ARC = (C * SWEEP) / 360;
const START = 90 + (360 - SWEEP) / 2;
const GLIDE_MS = 450;

function clamp01(v) {
  "worklet";
  return Math.max(0, Math.min(1, v));
}

export default function VitalRing({
  value = null,
  min,
  max,
  range = null,
  label,
  name,
  unit,
  metric,
  online = true,
  pulseBpm = null,
  active = true,
  size = 104,
}) {
  const reduced = useReducedMotion();
  const [showRange, setShowRange] = useState(false);
  const gradientId = `ring${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const has = value != null;
  const fraction = has ? (value - min) / (max - min) : 0;
  const f = useSharedValue(fraction);
  const glow = useSharedValue(0);

  useEffect(() => {
    f.value = reduced || !online ? clamp01(fraction) : withTiming(clamp01(fraction), { duration: GLIDE_MS, easing: Easing.out(Easing.cubic) });
  }, [fraction, reduced, online, f]);

  const pulsing = !!pulseBpm && online && active && !reduced;
  useEffect(() => {
    if (!pulsing) {
      cancelAnimation(glow);
      glow.value = 0;
      return undefined;
    }
    glow.value = 0;
    glow.value = withRepeat(withTiming(1, { duration: 60000 / Math.min(220, Math.max(30, pulseBpm)), easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(glow);
  }, [pulsing, pulseBpm, glow]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: ARC * (1 - f.value) }));
  const dotProps = useAnimatedProps(() => {
    const a = ((START + SWEEP * f.value) * Math.PI) / 180;
    return { cx: 50 + R * Math.cos(a), cy: 50 + R * Math.sin(a) };
  });
  const glowProps = useAnimatedProps(() => ({
    strokeOpacity: glow.value < 0.55 ? 0.22 * (1 - glow.value / 0.55) : 0,
    strokeWidth: STROKE + 7 * Math.min(1, glow.value / 0.55),
  }));

  const shown = showRange && online && range;
  const lo = shown ? clamp01((range.lo - min) / (max - min)) : 0;
  const hi = shown ? clamp01((range.hi - min) / (max - min)) : 0;
  const display = has ? String(Math.round(value)) : "—";
  const rotate = `rotate(${START} 50 50)`;

  return (
    <Pressable
      onPress={() => setShowRange((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={`${name}: ${has ? `${display} ${unit}` : "no data"}${online ? "" : ", last known"}`}
      accessibilityHint={showRange ? "Hides the last 2 minutes" : "Shows the range of the last 2 minutes"}
      accessibilityState={{ selected: showRange }}
      style={({ pressed }) => ({ width: size, height: size, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={metric.light} />
            <Stop offset="1" stopColor={metric.color} />
          </LinearGradient>
        </Defs>
        {pulsing && (
          <AnimatedCircle
            cx={50} cy={50} r={R} fill="none" stroke={metric.light}
            strokeDasharray={[ARC, C]} strokeLinecap="round" transform={rotate}
            animatedProps={glowProps}
          />
        )}
        <Circle
          cx={50} cy={50} r={R} fill="none" stroke={theme.ring.track} strokeWidth={STROKE}
          strokeDasharray={[ARC, C]} strokeLinecap="round" transform={rotate}
        />
        {shown && (
          <Circle
            cx={50} cy={50} r={R} fill="none" stroke={metric.color} strokeOpacity={0.28} strokeWidth={STROKE}
            strokeDasharray={[Math.max(0.5, (hi - lo) * ARC), C]} strokeDashoffset={-lo * ARC}
            strokeLinecap="round" transform={rotate}
          />
        )}
        {has && (
          <>
            <AnimatedCircle
              cx={50} cy={50} r={R} fill="none" stroke={online ? `url(#${gradientId})` : theme.ring.off}
              strokeWidth={STROKE} strokeDasharray={[ARC, C]} strokeLinecap="round" transform={rotate}
              animatedProps={arcProps}
            />
            <AnimatedCircle r={STROKE / 2 - 1.5} fill={theme.surface} animatedProps={dotProps} />
          </>
        )}
      </Svg>

      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{
          fontFamily: theme.font.regular, fontSize: theme.size.display - 2, color: online ? theme.text : theme.textMuted,
          fontVariant: ["tabular-nums"], includeFontPadding: false,
        }}>
          {display}
        </Text>
        <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.xxs, letterSpacing: 1.2, color: theme.textMuted, marginTop: 2 }}>
          {label.toUpperCase()}
        </Text>
        {shown && (
          <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.xxs, color: theme.textMuted, fontVariant: ["tabular-nums"] }}>
            {Math.round(range.lo)}–{Math.round(range.hi)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
