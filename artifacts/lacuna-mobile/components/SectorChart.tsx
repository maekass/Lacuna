import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SectorItem {
  sector: string;
  count: number;
}

interface SectorChartProps {
  sectors: SectorItem[];
}

const SECTOR_COLORS = [
  "#5d4e6d",
  "#4a5d8a",
  "#b8a9c9",
  "#e8b4b8",
  "#7c3aed",
  "#8a7d96",
];

export default function SectorChart({ sectors }: SectorChartProps) {
  const colors = useColors();
  const max = Math.max(...sectors.map((s) => s.count));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {sectors.map((item, i) => {
        const pct = (item.count / max) * 100;
        const barColor = SECTOR_COLORS[i % SECTOR_COLORS.length];
        return (
          <View key={item.sector} style={styles.row}>
            <Text
              style={[styles.label, { color: colors.blue }]}
              numberOfLines={1}
            >
              {item.sector}
            </Text>
            <View style={styles.barArea}>
              <View
                style={[
                  styles.barTrack,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: barColor, width: `${pct}%` as any },
                  ]}
                />
              </View>
              <Text style={[styles.count, { color: colors.textMuted }]}>
                {item.count}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  row: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  barArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  count: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    minWidth: 20,
    textAlign: "right",
  },
});
