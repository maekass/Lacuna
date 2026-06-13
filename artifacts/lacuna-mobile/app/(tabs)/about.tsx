import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { provenance } from "@/lib/dataset";

interface MethodCardProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
}

function MethodCard({ icon, title, description }: MethodCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.methodCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.secondary },
        ]}
      >
        <Feather name={icon} size={20} color={colors.plum} />
      </View>
      <View style={styles.methodInfo}>
        <Text style={[styles.methodTitle, { color: colors.plum }]}>
          {title}
        </Text>
        <Text style={[styles.methodDesc, { color: colors.blue }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        Platform.OS === "web" && styles.webContent,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.plum }]}>
        Methods & Sources
      </Text>
      <Text style={[styles.pageSubtitle, { color: colors.blue }]}>
        How this dataset was built and what it can tell you.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.plum }]}>
        Analytical Approaches
      </Text>

      <MethodCard
        icon="git-commit"
        title="Causal DAG"
        description="Directed acyclic graphs map acquisition drivers to outcomes, separating confounders from treatment effects in observational deal data."
      />
      <MethodCard
        icon="clock"
        title="Event Timeline"
        description="Announced and closed dates anchor deals to macro health policy cycles, FDA approval windows, and sector funding rounds."
      />
      <MethodCard
        icon="sliders"
        title="Sensitivity Analysis"
        description="Bounds testing on disclosed valuations shows how robust sector comparisons are to missing deal values (n varies widely by sector)."
      />
      <MethodCard
        icon="bar-chart-2"
        title="Bayesian Small-N"
        description="For sectors with fewer than 5 deals, Bayesian credible intervals are used rather than frequentist confidence intervals."
      />
      <MethodCard
        icon="shield"
        title="Genomics Governance"
        description="HIPAA/GDPR compliance layer for variant data. All genomics callsets require LACUNA_VARIANT_STORE configuration."
      />

      <Text style={[styles.sectionTitle, { color: colors.plum }]}>
        Data Sources
      </Text>

      <View
        style={[
          styles.sourcesCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {provenance.sources.map((source, i) => (
          <View key={i} style={styles.sourceRow}>
            <View
              style={[styles.sourceDot, { backgroundColor: colors.lavender }]}
            />
            <Text style={[styles.sourceText, { color: colors.blue }]}>
              {source}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.disclaimerCard,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.disclaimerTitle, { color: colors.plum }]}>
          Disclaimer
        </Text>
        <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
          {provenance.disclaimer}
        </Text>
        <Text style={[styles.disclaimerNote, { color: colors.textMuted }]}>
          Not PitchBook, not live market feeds, and not investment advice.
          Descriptive analytics only from public sources.
        </Text>
      </View>

      <View style={styles.notesSection}>
        {provenance.notes.map((note, i) => (
          <Text
            key={i}
            style={[styles.noteText, { color: colors.textMuted }]}
          >
            · {note}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  webContent: {
    paddingTop: 87,
    paddingBottom: 74,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  methodInfo: { flex: 1, gap: 4 },
  methodTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  methodDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  sourcesCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  sourceText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  disclaimerCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  disclaimerNote: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  notesSection: { gap: 6 },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
});
