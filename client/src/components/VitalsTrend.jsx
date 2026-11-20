import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { formatClockTime } from "@/utils/formatClockTime";
import { theme } from "@/theme/theme";

const CHART_H = 160;
const PAD = { l: 34, r: 10, t: 12, b: 24 };
const TABLE_MAX_H = 260;

const METRICS = {
  heartRate: { label: "Heart rate", unit: "bpm", color: theme.metric.heart.color, step: 10 },
  spo2: { label: "Blood oxygen", unit: "%", color: theme.metric.oxygen.color, step: 1, tight: true },
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

function Chart({ points, metric, width }) {
  const [index, setIndex] = useState(null);
  const m = METRICS[metric];
  const stats = summarize(points);

  let lo;
  let hi;
  if (m.tight) {
    const pad = Math.max(m.step / 2, (stats.max - stats.min) * 0.25);
    lo = stats.min - pad;
    hi = stats.max + pad;
  } else {
    lo = Math.floor((stats.min - m.step * 0.3) / m.step) * m.step;
    hi = Math.ceil((stats.max + m.step * 0.3) / m.step) * m.step;
    if (hi - lo < m.step * 2) hi = lo + m.step * 2;
  }
  let ticks = [];
  for (let v = Math.ceil(lo / m.step) * m.step; v <= hi + 1e-9; v += m.step) ticks.push(v);
  while (ticks.length > 4) ticks = ticks.filter((_, i) => i % 2 === 0);

  const plotW = width - PAD.l - PAD.r;
  const plotH = CHART_H - PAD.t - PAD.b;
  const xs = (i) => PAD.l + (i / (points.length - 1)) * plotW;
  const ys = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * plotH;
  const d = points.map((p, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)} ${ys(p.value).toFixed(1)}`).join("");
  const last = points[points.length - 1];

  const pick = (x) => setIndex(Math.max(0, Math.min(points.length - 1, Math.round(((x - PAD.l) / plotW) * (points.length - 1)))));
  const focus = index == null ? null : points[index];
  const tipLeft = focus ? Math.max(0, Math.min(width - 110, xs(index) - 55)) : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${m.label}, last ${points.length} readings: minimum ${stats.min}, average ${stats.avg}, maximum ${stats.max} ${m.unit}`}
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
          {formatClockTime(points[0].at)}
        </SvgText>
        <SvgText x={width - PAD.r} y={CHART_H - 6} textAnchor="end" fontSize={theme.size.xs} fontFamily={theme.font.regular} fill={theme.textMuted}>
          Now
        </SvgText>

        <Path d={d} stroke={m.color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={xs(points.length - 1)} cy={ys(last.value)} r={4} fill={m.color} stroke={theme.surface} strokeWidth={2} />

        {focus && (
          <>
            <Line x1={xs(index)} x2={xs(index)} y1={PAD.t} y2={PAD.t + plotH} stroke={theme.textMuted} strokeWidth={1} strokeDasharray="3 3" />
            <Circle cx={xs(index)} cy={ys(focus.value)} r={5} fill={m.color} stroke={theme.surface} strokeWidth={2} />
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
            {focus.value} {m.unit}
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

export default function VitalsTrend({ measurements = [] }) {
  const [metric, setMetric] = useState("heartRate");
  const [showTable, setShowTable] = useState(false);
  const [width, setWidth] = useState(0);

  const m = METRICS[metric];
  const points = useMemo(
    () => measurements
      .filter((x) => x[metric] != null)
      .map((x) => ({ at: x.measuredAt, value: Math.round(x[metric]) }))
      .reverse(),
    [measurements, metric],
  );
  const enough = points.length >= 2;
  const stats = enough ? summarize(points) : null;

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

        {enough && (
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

      {!enough ? (
        <Text style={{ ...muted, fontSize: theme.size.sm, textAlign: "center", paddingVertical: theme.space.xl }}>
          Not enough readings yet.
        </Text>
      ) : (
        <>
          {showTable ? (
            <ScrollView nestedScrollEnabled style={{ maxHeight: TABLE_MAX_H }}>
              {points.slice().reverse().map((p, i) => (
                <View
                  key={`${p.at}-${i}`}
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
              {width > 0 && <Chart points={points} metric={metric} width={width} />}
            </View>
          )}

          <View style={{
            flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.border,
            marginHorizontal: -theme.space.lg, marginTop: theme.space.md,
          }}>
            <Stat label="Min" value={stats.min} unit={m.unit} />
            <Stat label="Average" value={stats.avg} unit={m.unit} divider />
            <Stat label="Max" value={stats.max} unit={m.unit} divider />
          </View>
        </>
      )}
    </View>
  );
}
