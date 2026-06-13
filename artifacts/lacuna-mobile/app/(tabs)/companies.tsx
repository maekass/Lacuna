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
import { companies } from "@/lib/dataset";
import CompanyCard from "@/components/CompanyCard";

export default function CompaniesScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const sectors = useMemo(() => {
    const set = new Set(companies.map((c) => c.sector));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return companies.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        c.hq.toLowerCase().includes(q);
      const matchesSector = !selectedSector || c.sector === selectedSector;
      return matchesQuery && matchesSector;
    });
  }, [query, selectedSector]);

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
            placeholder="Search companies, sectors…"
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

        <FlatList
          horizontal
          data={[null, ...sectors]}
          keyExtractor={(item) => item ?? "__all__"}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedSector(item)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedSector === item ? colors.primary : colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      selectedSector === item
                        ? colors.primaryForeground
                        : colors.textMuted,
                  },
                ]}
              >
                {item ?? "All"}
              </Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
        />

        <Text style={[styles.countText, { color: colors.textMuted }]}>
          {filtered.length} companies
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CompanyCard company={item} />}
        contentContainerStyle={[
          styles.list,
          Platform.OS === "web" && styles.webList,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="briefcase" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No companies found
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
  chips: { paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
