import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Company } from "@/lib/dataset";

interface CompanyCardProps {
  company: Company;
}

function formatFunding(value?: number): string {
  if (!value) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value}M`;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: colors.plum }]} numberOfLines={1}>
            {company.name}
          </Text>
          <Text style={[styles.hq, { color: colors.textMuted }]}>
            {company.hq} · est. {company.founded}
          </Text>
        </View>
        <View
          style={[
            styles.stageBadge,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.stageText, { color: colors.blue }]}>
            {company.stage}
          </Text>
        </View>
      </View>

      <View
        style={[styles.sectorTag, { backgroundColor: "rgba(184,169,201,0.18)" }]}
      >
        <Text style={[styles.sectorText, { color: colors.plum }]}>
          {company.sector}
        </Text>
      </View>

      {company.description ? (
        <Text
          style={[styles.description, { color: colors.blue }]}
          numberOfLines={2}
        >
          {company.description}
        </Text>
      ) : null}

      <View style={styles.metricsRow}>
        {company.totalFunding != null && (
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.plum }]}>
              {formatFunding(company.totalFunding)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              Total Funding
            </Text>
          </View>
        )}
        {company.lastKnownValuation != null && (
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: colors.plum }]}>
              {formatFunding(company.lastKnownValuation)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              Last Valuation
            </Text>
          </View>
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
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  nameBlock: { flex: 1, gap: 2 },
  name: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  hq: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  stageText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sectorTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectorText: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 2,
  },
  metric: { gap: 2 },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
