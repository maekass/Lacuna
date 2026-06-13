import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import {
  companies,
  acquisitions,
  provenance,
  getTotalDealValue,
  getSectorCounts,
  acquirers,
} from "@/lib/dataset";
import StatCard from "@/components/StatCard";
import SectorChart from "@/components/SectorChart";

export default function HubScreen() {
  const colors = useColors();

  const totalValue = useMemo(() => getTotalDealValue(), []);
  const sectorCounts = useMemo(() => getSectorCounts().slice(0, 6), []);

  const disclosedDeals = acquisitions.filter((a) => a.dealValue != null);

  const stats = [
    { label: "Companies", value: String(companies.length) },
    { label: "Verified Deals", value: String(acquisitions.length) },
    { label: "Disclosed Value", value: `$${(totalValue / 1000).toFixed(1)}B` },
    { label: "Acquirers", value: String(acquirers.length) },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        Platform.OS === "web" && styles.webContent,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={[styles.subtitle, { color: colors.accent }]}>
          INVESTMENT RESEARCH
        </Text>
        <Text style={[styles.title, { color: colors.plum }]}>
          Women&apos;s Health{"\n"}M&A Diligence
        </Text>
        <Text style={[styles.description, { color: colors.blue }]}>
          Verified deal provenance, clinical trial search, genomics governance,
          and cited analytics from public sources.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </View>

      <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.insightLabel, { color: colors.accent }]}>
          DATASET INSIGHT
        </Text>
        <Text style={[styles.insightText, { color: colors.blue }]}>
          {disclosedDeals.length} of {acquisitions.length} deals have disclosed
          valuations. Dataset covers {provenance.lastUpdated} — sourced from{" "}
          {provenance.sources.length} public references.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.plum }]}>
          Deals by Sector
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          {sectorCounts.length} active sectors
        </Text>
      </View>

      <SectorChart sectors={sectorCounts} />

      <View style={[styles.provenanceCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.provenanceTitle, { color: colors.plum }]}>
          Data Provenance
        </Text>
        <Text style={[styles.provenanceText, { color: colors.blue }]}>
          v{provenance.datasetVersion ?? "6"} · Updated {provenance.lastUpdated}
        </Text>
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          {provenance.disclaimer}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  webContent: {
    paddingTop: 87,
  },
  hero: {
    gap: 8,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  insightCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  provenanceCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  provenanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  provenanceText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
});
