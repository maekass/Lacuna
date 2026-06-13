import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { acquisitions, formatDealValue, companies } from "@/lib/dataset";
import DealCard from "@/components/DealCard";

type SortKey = "date" | "value";

export default function DealsScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let list = acquisitions.filter(
      (a) =>
        !q ||
        a.targetName.toLowerCase().includes(q) ||
        a.acquirerName.toLowerCase().includes(q) ||
        a.dealType.toLowerCase().includes(q)
    );
    if (sort === "value") {
      list = [...list].sort(
        (a, b) => (b.dealValue ?? 0) - (a.dealValue ?? 0)
      );
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.announcedDate).getTime() -
          new Date(a.announcedDate).getTime()
      );
    }
    return list;
  }, [query, sort]);

  const disclosed = acquisitions.filter((a) => a.dealValue != null).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, Platform.OS === "web" && styles.webHeader]}>
        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search deals, acquirers…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.sortRow}>
          <Text style={[styles.countText, { color: colors.textMuted }]}>
            {filtered.length} deals · {disclosed} disclosed
          </Text>
          <View style={styles.sortButtons}>
            {(["date", "value"] as SortKey[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => setSort(key)}
                style={[
                  styles.sortBtn,
                  {
                    backgroundColor:
                      sort === key ? colors.primary : colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    {
                      color:
                        sort === key ? colors.primaryForeground : colors.textMuted,
                    },
                  ]}
                >
                  {key === "date" ? "Recent" : "Value"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const target = companies.find((c) => c.id === item.targetId);
          return <DealCard deal={item} company={target} />;
        }}
        contentContainerStyle={[
          styles.list,
          Platform.OS === "web" && styles.webList,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No deals match your search
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  webHeader: {
    paddingTop: 79,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sortButtons: {
    flexDirection: "row",
    gap: 6,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  webList: {
    paddingBottom: 74,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
