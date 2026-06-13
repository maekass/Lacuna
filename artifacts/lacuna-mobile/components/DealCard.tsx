import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Acquisition, Company, formatDealValue } from "@/lib/dataset";

interface DealCardProps {
  deal: Acquisition;
  company?: Company;
}

export default function DealCard({ deal, company }: DealCardProps) {
  const colors = useColors();

  const year = deal.announcedDate.slice(0, 4);
  const hasValue = deal.dealValue != null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.names}>
          <Text style={[styles.targetName, { color: colors.plum }]} numberOfLines={1}>
            {deal.targetName}
          </Text>
          <Text style={[styles.acquirerName, { color: colors.blue }]} numberOfLines={1}>
            acq. by {deal.acquirerName}
          </Text>
        </View>
        <View style={styles.rightMeta}>
          <Text style={[styles.year, { color: colors.textMuted }]}>{year}</Text>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.typeText, { color: colors.blue }]}>
              {deal.dealType}
            </Text>
          </View>
        </View>
      </View>

      {company && (
        <Text style={[styles.sector, { color: colors.textMuted }]}>
          {company.sector} · {company.hq}
        </Text>
      )}

      <Text style={[styles.rationale, { color: colors.blue }]} numberOfLines={2}>
        {deal.strategicRationale}
      </Text>

      <View style={styles.bottomRow}>
        <Text
          style={[
            styles.value,
            { color: hasValue ? colors.plum : colors.textMuted },
          ]}
        >
          {formatDealValue(deal.dealValue)}
        </Text>
        {deal.dealValueNote && (
          <Text style={[styles.valueNote, { color: colors.textMuted }]}>
            {deal.dealValueNote}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  names: { flex: 1, gap: 2 },
  targetName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  acquirerName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  rightMeta: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  year: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sector: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rationale: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  valueNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
