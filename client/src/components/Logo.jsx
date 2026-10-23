import { View, Text } from "react-native";
import Svg, { Rect, Path } from "react-native-svg";
import { theme } from "../theme/theme";

const HEART = "M50 63 C40 56 34 50 34 44 C34 39 38 36 42 36 C46 36 49 38 50 41 C51 38 54 36 58 36 C62 36 66 39 66 44 C66 50 60 56 50 63 Z";

export function LogoMark({ size = 32, color = theme.primary, heartColor = theme.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      <Rect x="37" y="8" width="26" height="16" rx="5" fill={color} />
      <Rect x="37" y="76" width="26" height="16" rx="5" fill={color} />
      <Rect x="22" y="20" width="56" height="60" rx="18" fill="none" stroke={color} strokeWidth="8" />
      <Path d={HEART} fill={heartColor} />
    </Svg>
  );
}

export default function Logo({ size = 32, color = theme.primary, heartColor = theme.accent, textColor = theme.text }) {
  return (
    <View
      accessible
      accessibilityLabel="CaTch"
      style={{ flexDirection: "row", alignItems: "center", gap: size * 0.2 }}
    >
      <LogoMark size={size} color={color} heartColor={heartColor} />
      <Text style={{ fontFamily: theme.font.semibold, fontSize: size * 0.72, letterSpacing: -0.3, color: textColor }}>
        CaTch
      </Text>
    </View>
  );
}
