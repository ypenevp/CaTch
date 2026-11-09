export const GROUND_Y = 222;

const TORSO = 60;
const NECK = 8;
export const HEAD_R = 15;
const UPPER_ARM = 32;
const FOREARM = 30;
const THIGH = 44;
const SHIN = 44;

export const POSES = {
  sitting: [100, 174, -14, 12, 40, 6, 46, 86, -86, 82, -80],
  lying: [134, 181, -90, 82, 6, 96, -6, 90, 0, 88, 2],
  fallen: [138, 205, -92, -100, -30, 70, 20, 100, -40, 84, 10],
};

export const WALK_STILL_PHASE = Math.PI / 2;

function rad(d) {
  "worklet";
  return (d * Math.PI) / 180;
}

function step(p, len, angle) {
  "worklet";
  return [p[0] + len * Math.sin(rad(angle)), p[1] + len * Math.cos(rad(angle))];
}

export function joints(pose, chestLift = 0) {
  "worklet";
  const [hx, hy, t, fa, fb, ba, bb, fl, fk, bl, bk] = pose;
  const hip = [hx, hy];
  const td = [Math.sin(rad(t)), -Math.cos(rad(t))];
  const fwd = [Math.cos(rad(t)), Math.sin(rad(t))];
  const len = TORSO + chestLift;
  const sh = [hx + len * td[0], hy + len * td[1]];
  const head = [sh[0] + (NECK + HEAD_R) * td[0], sh[1] + (NECK + HEAD_R) * td[1]];
  const fe = step(sh, UPPER_ARM, fa);
  const fh = step(fe, FOREARM, fa + fb);
  const be = step(sh, UPPER_ARM, ba);
  const bh = step(be, FOREARM, ba + bb);
  const fkn = step(hip, THIGH, fl);
  const ff = step(fkn, SHIN, fl + fk);
  const bkn = step(hip, THIGH, bl);
  const bf = step(bkn, SHIN, bl + bk);
  const chest = [hx + 0.74 * len * td[0] + 5 * fwd[0], hy + 0.74 * len * td[1] + 5 * fwd[1]];
  const band0 = [fe[0] + (fh[0] - fe[0]) * 0.66, fe[1] + (fh[1] - fe[1]) * 0.66];
  const band1 = [fe[0] + (fh[0] - fe[0]) * 0.86, fe[1] + (fh[1] - fe[1]) * 0.86];
  return { hip, sh, head, fe, fh, be, bh, fk: fkn, ff, bk: bkn, bf, chest, band0, band1 };
}

export function walkPose(phase) {
  "worklet";
  const s = Math.sin(phase);
  const fwdSwing = Math.max(0, Math.cos(phase));
  const backSwing = Math.max(0, Math.cos(phase + Math.PI));
  const pose = [120, 132, 5, -18 * s, 16, 18 * s, 16, 22 * s, -34 * fwdSwing, -22 * s, -34 * backSwing];
  const j = joints(pose);
  pose[1] += GROUND_Y - 2 - Math.max(j.ff[1], j.bf[1]);
  return pose;
}
