import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import ErrorBox from "@/components/ErrorBox";
import { formatClockTime } from "@/utils/formatClockTime";
import { theme } from "@/theme/theme";

const CHART_H = 160;
const PAD = { l: 34, r: 10, t: 12, b: 24 };
const TABLE_MAX_H = 260;
const LIVE_MAX_GAP_MS = 5000;
const STATISTICS_MAX_GAP_BUCKETS = 3;

const METRICS = {
  heartRate: { label: "Heart rate", unit: "bpm", color: theme.metric.heart.color, step: 10, averageKey: "heartRateAverage" },
  spo2: { label: "Blood oxygen", unit: "%", color: theme.metric.oxygen.color, step: 1, tight: true, averageKey: "spo2Average" },
};

const muted = { fontFamily: theme.font.regular, fontSize: theme.size.xs, color: theme.textMuted };

function summarize(points) {
  const values = points.map((p) => p.value);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
  };
}

function fromMeasurements(measurements, metric) {
  const points = measurements
    .filter((x) => x[metric] != null)
    .map((x) => ({ at: Date.parse(x.measuredAt), value: Math.round(x[metric]) }))
    .reverse();
  if (points.length < 2) return null;

  return {
    points,
    summary: summarize(points),
    from: points[0].at,
    to: points[points.length - 1].at,
    maxGapMs: LIVE_MAX_GAP_MS,
    rangeLabel: `last ${points.length} readings`,
    averaged: false,
  };
}

function fromStatistics(statistics, metric) {
  const key = METRICS[metric].averageKey;
  const total = statistics[metric];
  const points = statistics.points
    .filter((p) => p[key] != null)
    .map((p) => ({ at: Date.parse(p.start), value: Math.round(p[key]) }));
  if (points.length < 2 || !total?.samples) return null;

  const from = Date.parse(statistics.from);
  const to = Date.parse(statistics.to);
  return {
    points,
    summary: { min: Math.round(total.min), avg: Math.round(total.average), max: Math.round(total.max) },
    from,
    to,
    maxGapMs: statistics.bucketSeconds * 1000 * STATISTICS_MAX_GAP_BUCKETS,
    rangeLabel: `last ${Math.round((to - from) / 60000)} minutes`,
    averaged: true,
  };
}

function Chart({ series, metric, width }) {
  const [index, setIndex] = useState(null);
  const m = METRICS[metric];
  const { points, summary, from, to, maxGapMs, rangeLabel, averaged } = series;
  const axis = summarize(points);

  let lo;
  let hi;
  if (m.tight) {
    const pad = Math.max(m.step / 2, (axis.max - axis.min) * 0.25);
    lo = axis.min - pad;
    hi = axis.max + pad;
  } else {
    lo = Math.floor((axis.min - m.step * 0.3) / m.step) * m.step;
    hi = Math.ceil((axis.max + m.step * 0.3) / m.step) * m.step;
    if (hi - lo < m.step * 2) hi = lo + m.step * 2;
  }
  let ticks = [];
  for (let v = Math.ceil(lo / m.step) * m.step; v <= hi + 1e-9; v += m.step) ticks.push(v);
  while (ticks.length > 4) ticks = ticks.filter((_, i) => i % 2 === 0);

  const plotW = width - PAD.l - PAD.r;
  const plotH = CHART_H - PAD.t - PAD.b;
  const span = Math.max(1, to - from);
  const xs = (t) => PAD.l + ((t - from) / span) * plotW;
  const ys = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * plotH;
  const d = points
    .map((p, i) => {
      const jump = i === 0 || p.at - points[i - 1].at > maxGapMs;
      return `${jump ? "M" : "L"}${xs(p.at).toFixed(1)} ${ys(p.value).toFixed(1)}`;
    })
    .join("");
  const last = points[points.length - 1];

  const pick = (x) => {
    const t = from + ((x - PAD.l) / plotW) * span;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.at - t) < Math.abs(points[best].at - t)) best = i;
    });
    setIndex(best);
  };
  const focus = index == null ? null : points[index];
  const tipLeft = focus ? Math.max(0, Math.min(width - 110, xs(focus.at) - 55)) : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${m.label}, ${rangeLabel}: minimum ${summary.min}, average ${summary.avg}, maximum ${summary.max} ${m.unit}`}
      style={{ height: CHART_H }}
    >
      <Svg width={width} height={CHART_H}>
        {ticks.map((v) => (
          <Line key={`g${v}`} x1={PAD.l} x2={width - PAD.r} y1={ys(v)} y2={ys(v)} stroke={theme.chart.grid} strokeWidth={1} />
        ))}
        {ticks.map((v) => (
          <SvgText key={`y${v}`} x={PAD.l - 6} y={ys(v) + 4} textAnchor="end" fontSize={theme.size.xs} fontFamily={theme.font.regular} fill={theme.textMuted}>
            {v}
          </SvgText>
        ))}
        <SvgText x={PAD.l} y={CHART_H - 6} fontSize={theme.size.xs} fontFamily={theme.font.regular} fill={theme.textMuted}>
          {formatClockTime(from)}
        </SvgText>
        <SvgText x={width - PAD.r} y={CHART_H - 6} textAnchor="end" fontSize={theme.size.xs} fontFamily={theme.font.regular} fill={theme.textMuted}>
          Now
        </SvgText>

        <Path d={d} stroke={m.color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={xs(last.at)} cy={ys(last.value)} r={4} fill={m.color} stroke={theme.surface} strokeWidth={2} />

        {focus && (
          <>
            <Line x1={xs(focus.at)} x2={xs(focus.at)} y1={PAD.t} y2={PAD.t + plotH} stroke={theme.textMuted} strokeWidth={1} strokeDasharray="3 3" />
            <Circle cx={xs(focus.at)} cy={ys(focus.value)} r={5} fill={m.color} stroke={theme.surface} strokeWidth={2} />
          </>
        )}
      </Svg>

      <View
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        onResponderRelease={() => setIndex(null)}
        onResponderTerminate={() => setIndex(null)}
      />

      {focus && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute", top: -theme.space.sm, left: tipLeft, width: 110,
            backgroundColor: theme.text, borderRadius: theme.space.sm,
            paddingVertical: theme.space.xs, paddingHorizontal: theme.space.sm,
          }}
        >
          <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.md, color: theme.onPrimary }}>
            {averaged ? "Avg " : ""}{focus.value} {m.unit}
          </Text>
          <Text style={{ fontFamily: theme.font.regular, fontSize: theme.size.xs, color: theme.onPrimary }}>
            {formatClockTime(focus.at)}
          </Text>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, unit, divider }) {
  return (
    <View style={{
      flex: 1, alignItems: "center", paddingTop: theme.space.md,
      borderLeftWidth: divider ? 1 : 0, borderLeftColor: theme.border,
    }}>
      <Text style={muted}>{label}</Text>
      <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.xxl, color: theme.text, marginTop: 2 }}>
        {value}
        <Text style={muted}> {unit}</Text>
      </Text>
    </View>
  );
}

function PeriodChips({ periods, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm, marginBottom: theme.space.md }}>
      {periods.map((p) => {
        const selected = p.key === value;
        return (
          <TouchableOpacity
            key={p.key}
            onPress={() => onChange(p.key)}
            activeOpacity={0.8}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={{
              height: 32, paddingHorizontal: theme.space.md, borderRadius: 16, justifyContent: "center",
              borderWidth: 1, borderColor: selected ? theme.primaryBorder : theme.border,
              backgroundColor: selected ? theme.primarySoft : theme.bg,
            }}
          >
            <Text style={{
              fontFamily: selected ? theme.font.semibold : theme.font.medium,
              fontSize: theme.size.sm, color: selected ? theme.primary : theme.textMuted,
            }}>
              {p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function VitalsTrend({
  measurements = null,
  statistics = null,
  periods = null,
  period = null,
  onPeriodChange,
  loading = false,
  error = null,
  onRetry,
  retrying = false,
}) {
  const [metric, setMetric] = useState("heartRate");
  const [showTable, setShowTable] = useState(false);
  const [width, setWidth] = useState(0);

  const m = METRICS[metric];
  const series = useMemo(() => {
    if (statistics) return fromStatistics(statistics, metric);
    if (measurements) return fromMeasurements(measurements, metric);
    return null;
  }, [measurements, statistics, metric]);

  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: theme.radius,
      borderWidth: 1, borderColor: theme.border, ...theme.shadow.card,
      paddingHorizontal: theme.space.lg, paddingBottom: theme.space.md,
    }}>
      <View style={{
        flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border,
        marginHorizontal: -theme.space.lg, marginBottom: theme.space.lg, paddingRight: theme.space.sm,
      }}>
        <View accessibilityRole="tablist" style={{ flex: 1, flexDirection: "row" }}>
          {Object.entries(METRICS).map(([key, item]) => {
            const selected = key === metric;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setMetric(key)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{
                  fontFamily: selected ? theme.font.semibold : theme.font.medium,
                  fontSize: theme.size.md, color: selected ? theme.text : theme.textMuted,
                }}>
                  {item.label}
                </Text>
                {selected && (
                  <View style={{
                    position: "absolute", bottom: -1, left: "20%", right: "20%", height: 3,
                    borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: theme.primary,
                  }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {series && (
          <TouchableOpacity
            onPress={() => setShowTable((v) => !v)}
            activeOpacity={0.8}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={showTable ? "Show as chart" : "Show as table"}
            accessibilityState={{ selected: showTable }}
            style={{
              width: 36, height: 36, borderRadius: 10, marginLeft: theme.space.xs,
              alignItems: "center", justifyContent: "center", borderWidth: 1,
              borderColor: showTable ? theme.primaryBorder : theme.border,
              backgroundColor: showTable ? theme.primarySoft : theme.bg,
            }}
          >
            <MaterialCommunityIcons
              name={showTable ? "chart-line" : "table"}
              size={18}
              color={showTable ? theme.primary : theme.text}
            />
          </TouchableOpacity>
        )}
      </View>

      {periods && onPeriodChange && <PeriodChips periods={periods} value={period} onChange={onPeriodChange} />}

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ paddingVertical: theme.space.xl }} />
      ) : error && !series ? (
        <View>
          <ErrorBox message={error.message} />
          <TouchableOpacity
            onPress={onRetry}
            disabled={retrying}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ busy: retrying, disabled: retrying }}
            style={{ alignSelf: "center", paddingVertical: theme.space.xs }}
          >
            <Text style={{ fontFamily: theme.font.semibold, fontSize: theme.size.sm, color: theme.primary }}>
              {retrying ? "Retrying…" : "Try again"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : !series ? (
        <Text style={{ ...muted, fontSize: theme.size.sm, textAlign: "center", paddingVertical: theme.space.xl }}>
          Not enough readings yet.
        </Text>
      ) : (
        <>
          {showTable ? (
            <ScrollView nestedScrollEnabled style={{ maxHeight: TABLE_MAX_H }}>
              {series.points.slice().reverse().map((p, i) => (
                <View
                  key={p.at}
                  style={{
                    flexDirection: "row", paddingVertical: theme.space.sm,
                    borderTopWidth: i ? 1 : 0, borderTopColor: theme.border,
                  }}
                >
                  <Text style={{ ...muted, fontSize: theme.size.sm, flex: 1 }}>{formatClockTime(p.at)}</Text>
                  <Text style={{ fontFamily: theme.font.medium, fontSize: theme.size.sm, color: theme.text }}>
                    {p.value} {m.unit}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
              {width > 0 && <Chart series={series} metric={metric} width={width} />}
            </View>
          )}

          <View style={{
            flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.border,
            marginHorizontal: -theme.space.lg, marginTop: theme.space.md,
          }}>
            <Stat label="Min" value={series.summary.min} unit={m.unit} />
            <Stat label="Average" value={series.summary.avg} unit={m.unit} divider />
            <Stat label="Max" value={series.summary.max} unit={m.unit} divider />
          </View>
        </>
      )}
    </View>
  );
}
