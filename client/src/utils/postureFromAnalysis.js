const POSTURE_BY_ACTIVITY = {
  walking: "walking",
  stairs: "walking",
  still: "sitting",
  sit_stand_transition: "sitting",
  tying_shoe: "sitting",
  lie_getup_transition: "lying",
  fall: "fallen",
};

export function postureFromAnalysis(analysis) {
  if (!analysis) return null;
  if (analysis.fallDetected) return "fallen";
  return POSTURE_BY_ACTIVITY[analysis.activity] ?? "sitting";
}
