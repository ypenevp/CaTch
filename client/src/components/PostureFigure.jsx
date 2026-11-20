import { useEffect, useRef } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { GROUND_Y, HEAD_R, POSES, WALK_STILL_PHASE, joints, walkPose } from "@/utils/postureGeometry";
import { theme } from "@/theme/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BOX_W = 240;
const BOX_H = 200;

const FRAMES = {
  sitting: [50, 71, 107, 159],
  lying: [14, 152, 222, 74],
  walking: [66, 28, 100, 202],
  fallen: [9, 169, 230, 61],
};

const TRANSITION_MS = 450;
const FALL_MS = 380;
const WALK_PERIOD_MS = 1050;
const BREATH_MS = 4200;
const HALO_MS = 1400;
const HALO_REPEATS = 3;

const LIMB = 15;
const TORSO = 24;
const BAND = 19;
const HEART_R = 4.6;

export const POSTURE_LABELS = {
  sitting: "Sitting",
  lying: "Lying down",
  walking: "Walking",
  fallen: "Possible fall",
};

function fit(frame) {
  "worklet";
  const k = Math.min(BOX_W / frame[2], BOX_H / frame[3]);
  return [k, (BOX_W - frame[2] * k) / 2 - frame[0] * k, BOX_H - (frame[1] + frame[3]) * k];
}

function targetPose(posture, phase) {
  "worklet";
  return posture === "walking" ? walkPose(phase) : POSES[posture];
}

function lerp(a, b, t) {
  "worklet";
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

function pt(p, v) {
  "worklet";
  return `${(p[0] * v[0] + v[1]).toFixed(1)} ${(p[1] * v[0] + v[2]).toFixed(1)}`;
}

function poly(v, ...points) {
  "worklet";
  return points.map((p, i) => `${i ? "L" : "M"}${pt(p, v)}`).join("");
}

const FALL_VIEW = fit(FRAMES.fallen);
const FALL_HALO = (() => {
  const j = joints(POSES.fallen);
  const c = [(j.head[0] + j.ff[0]) / 2, (j.head[1] + j.ff[1]) / 2];
  return [c[0] * FALL_VIEW[0] + FALL_VIEW[1], c[1] * FALL_VIEW[0] + FALL_VIEW[2]];
})();

function Chair() {
  const { prop, propSoft } = theme.figure;
  return (
    <>
      <Rect x={60} y={150} width={56} height={8} rx={4} fill={propSoft} />
      <Line x1={110} y1={158} x2={110} y2={178} stroke={propSoft} strokeWidth={6} strokeLinecap="round" />
      <Line x1={76} y1={190} x2={64} y2={110} stroke={prop} strokeWidth={14} strokeLinecap="round" />
      <Rect x={56} y={178} width={66} height={14} rx={7} fill={prop} />
      <Path d="M62 192V221M116 192V221" stroke={prop} strokeWidth={5} strokeLinecap="round" />
    </>
  );
}

function Bed() {
  const { prop, propSoft } = theme.figure;
  return (
    <>
      <Rect x={18} y={158} width={10} height={64} rx={5} fill={prop} />
      <Rect x={26} y={193} width={206} height={14} rx={6} fill={prop} />
      <Rect x={30} y={185} width={42} height={11} rx={5.5} fill={propSoft} />
      <Path d="M40 207V221M222 207V221" stroke={prop} strokeWidth={5} strokeLinecap="round" />
    </>
  );
}

function Furniture({ posture }) {
  if (posture !== "sitting" && posture !== "lying") return null;
  const [k, tx, ty] = fit(FRAMES[posture]);
  return (
    <G transform={`translate(${tx} ${ty}) scale(${k})`}>
      {posture === "sitting" ? <Chair /> : <Bed />}
    </G>
  );
}

export default function PostureFigure({ posture = "sitting", bpm = null, online = true, active = true, width = 200 }) {
  const reduced = useReducedMotion();
  const animate = online && active && !reduced;
  const fallen = posture === "fallen" && online;

  const fromPose = useSharedValue(targetPose(posture, WALK_STILL_PHASE));
  const fromView = useSharedValue(fit(FRAMES[posture]));
  const target = useSharedValue(posture);
  const progress = useSharedValue(1);
  const phase = useSharedValue(WALK_STILL_PHASE);
  const breath = useSharedValue(0);
  const beat = useSharedValue(1);
  const halo = useSharedValue(1);

  const pose = useDerivedValue(() => lerp(fromPose.value, targetPose(target.value, phase.value), progress.value));
  const view = useDerivedValue(() => lerp(fromView.value, fit(FRAMES[target.value]), progress.value));
  const pts = useDerivedValue(() => joints(pose.value, breath.value * 1.2));

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    fromPose.value = pose.value;
    fromView.value = view.value;
    target.value = posture;
    progress.value = 0;
    progress.value = reduced
      ? 1
      : withTiming(1, {
        duration: posture === "fallen" ? FALL_MS : TRANSITION_MS,
        easing: posture === "fallen" ? Easing.in(Easing.cubic) : Easing.inOut(Easing.cubic),
      });
  }, [posture]);

  useEffect(() => {
    if (posture === "walking" && animate) {
      phase.value = withRepeat(
        withTiming(phase.value + 2 * Math.PI, { duration: WALK_PERIOD_MS, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(phase);
      if (reduced) phase.value = WALK_STILL_PHASE;
    }
    return () => cancelAnimation(phase);
  }, [posture, animate, reduced, phase]);

  useEffect(() => {
    if (!animate || !bpm) {
      cancelAnimation(beat);
      beat.value = 1;
      return undefined;
    }
    const ms = 60000 / Math.min(220, Math.max(30, bpm));
    beat.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: ms * 0.14 }),
        withTiming(1, { duration: ms * 0.14 }),
        withTiming(1.25, { duration: ms * 0.14 }),
        withTiming(1, { duration: ms * 0.18 }),
        withTiming(1, { duration: ms * 0.4 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(beat);
  }, [animate, bpm, beat]);

  useEffect(() => {
    if (animate && (posture === "sitting" || posture === "lying")) {
      breath.value = withRepeat(withTiming(1, { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      cancelAnimation(breath);
      breath.value = 0;
    }
    return () => cancelAnimation(breath);
  }, [animate, posture, breath]);

  useEffect(() => {
    if (fallen && animate) {
      halo.value = 0;
      halo.value = withRepeat(withTiming(1, { duration: HALO_MS, easing: Easing.out(Easing.quad) }), HALO_REPEATS, false);
    } else {
      cancelAnimation(halo);
      halo.value = 1;
    }
    return () => cancelAnimation(halo);
  }, [fallen, animate, halo]);

  const ground = useAnimatedProps(() => {
    const y = (GROUND_Y + 1) * view.value[0] + view.value[2];
    return { d: `M4 ${y.toFixed(1)}H${BOX_W - 4}` };
  });
  const backArm = useAnimatedProps(() => ({ d: poly(view.value, pts.value.sh, pts.value.be, pts.value.bh), strokeWidth: LIMB * view.value[0] }));
  const backLeg = useAnimatedProps(() => ({ d: poly(view.value, pts.value.hip, pts.value.bk, pts.value.bf), strokeWidth: LIMB * view.value[0] }));
  const torso = useAnimatedProps(() => ({ d: poly(view.value, pts.value.hip, pts.value.sh), strokeWidth: TORSO * view.value[0] }));
  const frontLeg = useAnimatedProps(() => ({ d: poly(view.value, pts.value.hip, pts.value.fk, pts.value.ff), strokeWidth: LIMB * view.value[0] }));
  const frontArm = useAnimatedProps(() => ({ d: poly(view.value, pts.value.sh, pts.value.fe, pts.value.fh), strokeWidth: LIMB * view.value[0] }));
  const band = useAnimatedProps(() => ({ d: poly(view.value, pts.value.band0, pts.value.band1), strokeWidth: BAND * view.value[0] }));
  const head = useAnimatedProps(() => ({
    cx: pts.value.head[0] * view.value[0] + view.value[1],
    cy: pts.value.head[1] * view.value[0] + view.value[2],
    r: HEAD_R * view.value[0],
  }));
  const heart = useAnimatedProps(() => ({
    cx: pts.value.chest[0] * view.value[0] + view.value[1],
    cy: pts.value.chest[1] * view.value[0] + view.value[2],
    r: HEART_R * view.value[0] * beat.value,
  }));
  const haloProps = useAnimatedProps(() => ({ r: (40 + 45 * halo.value) * FALL_VIEW[0], strokeOpacity: 0.55 * (1 - halo.value) }));

  const front = !online ? theme.textMuted : fallen ? theme.danger : theme.primary;
  const back = !online ? theme.figure.mutedBack : fallen ? theme.figure.dangerBack : theme.figure.back;
  const heartColor = online ? theme.metric.heart.color : theme.textMuted;
  const bandColor = online ? theme.text : theme.textMuted;
  const limb = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Posture: ${POSTURE_LABELS[posture]}${online ? "" : ", device offline"}`}
      style={{ width, height: (width * BOX_H) / BOX_W }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${BOX_W} ${BOX_H}`}>
        <AnimatedPath animatedProps={ground} stroke={theme.border} strokeWidth={2} strokeLinecap="round" />
        <Furniture posture={posture} />

        {fallen && (reduced || !active ? (
          <Circle cx={FALL_HALO[0]} cy={FALL_HALO[1]} r={62 * FALL_VIEW[0]} fill="none" stroke={theme.danger} strokeWidth={3} strokeOpacity={0.45} />
        ) : (
          <AnimatedCircle cx={FALL_HALO[0]} cy={FALL_HALO[1]} fill="none" stroke={theme.danger} strokeWidth={3} animatedProps={haloProps} />
        ))}

        <AnimatedPath animatedProps={backArm} stroke={back} {...limb} />
        <AnimatedPath animatedProps={backLeg} stroke={back} {...limb} />
        <AnimatedPath animatedProps={torso} stroke={front} {...limb} />
        <AnimatedCircle animatedProps={head} fill={front} />
        <AnimatedPath animatedProps={frontLeg} stroke={front} {...limb} />
        <AnimatedPath animatedProps={frontArm} stroke={front} {...limb} />
        <AnimatedPath animatedProps={band} stroke={bandColor} fill="none" />
        <AnimatedCircle animatedProps={heart} fill={heartColor} stroke={theme.surface} strokeWidth={2.5} />
      </Svg>
    </View>
  );
}
