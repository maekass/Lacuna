import React, { useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { acquirers, getAcquirerDealCounts, acquisitions, formatDealValue } from "@/lib/dataset";

export default function AcquirersScreen() {
  const colors = useColors();

  const dealCounts = useMemo(() => getAcquirerDealCounts(), []);
  const maxDeals = useMemo(() => Math.max(...dealCounts.map((d) => d.count)), [dealCounts]);

  const enriched = useMemo(
    () =>
      dealCounts.map((dc) => {
        const acquirer = acquirers.find((a) => a.id === dc.id);
        const deals = acquisitions.filter((a) => a.acquirerId === dc.id);
        const totalValue = deals.reduce((s, d) => s + (d.dealValue ?? 0), 0);
        return {
          ...dc,
          ticker: acquirer?.ticker,
          sector: acquirer?.sector ?? "—",
          hq: acquirer?.hq ?? "—",
          totalValue,
        };
      }),
    [dealCounts]
  );

  return (
    <FlatList
      data={enriched}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.list,
        Platform.OS === "web" && styles.webList,
      ]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={enriched.length > 0}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={[styles.heading, { color: colors.plum }]}>
            Acquirer Landscape
          </Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>
            {acquirers.length} acquirers · ranked by deal count
          </Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const pct = (item.count / maxDeals) * 100;
        return (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <View style={styles.rankBadge}>
                  <Text style={[styles.rankText, { color: colors.textMuted }]}>
                    #{index + 1}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.acquirerName, { color: colors.plum }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {item.sector}
                    {item.ticker ? ` · ${item.ticker}` : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.dealCount}>
                <Text style={[styles.dealCountNum, { color: colors.primary }]}>
                  {item.count}
                </Text>
                <Text style={[styles.dealCountLabel, { color: colors.textMuted }]}>
                  deal{item.count !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.lavender,
                    width: `${pct}%` as any,
                  },
                ]}
              />
            </View>

            {item.totalValue > 0 && (
              <Text style={[styles.valueText, { color: colors.blue }]}>
                {formatDealValue(item.totalValue)} total disclosed value
              </Text>
            )}
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  webList: {
    paddingTop: 87,
    paddingBottom: 74,
  },
  listHeader: {
    marginBottom: 16,
    gap: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  acquirerName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  dealCount: {
    alignItems: "center",
  },
  dealCountNum: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  dealCountLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -2,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  valueText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
