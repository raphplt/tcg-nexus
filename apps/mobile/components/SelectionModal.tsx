import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface SelectionOption {
  id: string;
  name: string;
}

interface SelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  options: SelectionOption[];
  selectedValue?: string;
  onSelect: (id: string | undefined) => void;
  placeholder?: string;
  showSearch?: boolean;
  showAllOption?: boolean;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({
  isVisible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  placeholder = "Rechercher...",
  showSearch = true,
  showAllOption = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isVisible) {
      setSearchQuery("");
    }
  }, [isVisible]);

  const filteredOptions = showSearch
    ? options.filter((opt) =>
        opt.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  const displayData = showAllOption
    ? [
        { id: "all", name: `Toutes / Tous (${title.toLowerCase()})` },
        ...filteredOptions,
      ]
    : filteredOptions;

  const handleSelectItem = (id: string) => {
    if (id === "all") {
      onSelect(undefined);
    } else {
      onSelect(id);
    }
    onClose();
  };

  const renderItem = ({ item }: { item: SelectionOption }) => {
    const isSelected =
      item.id === "all" ? !selectedValue : selectedValue === item.id;

    return (
      <Pressable
        onPress={() => handleSelectItem(item.id)}
        style={({ pressed }) => [
          styles.itemRow,
          isSelected && styles.itemRowSelected,
          pressed && styles.itemRowPressed,
        ]}
      >
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#0b0b0b" />
        )}
      </Pressable>
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={isVisible}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.modalClose,
              pressed && styles.modalClosePressed,
            ]}
          >
            <Ionicons name="close" size={20} color="#0b0b0b" />
          </Pressable>
        </View>

        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={16}
              color="#777777"
              style={styles.searchIcon}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={setSearchQuery}
              placeholder={placeholder}
              placeholderTextColor="#777777"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={16} color="#777777" />
              </Pressable>
            )}
          </View>
        )}

        <FlatList
          contentContainerStyle={styles.listContent}
          data={displayData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun résultat trouvé.</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "#fcfcfc",
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  modalTitle: {
    color: "#0b0b0b",
    fontSize: 20,
    fontWeight: "800",
  },
  modalClose: {
    alignItems: "center",
    backgroundColor: "#f3f5f9",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  modalClosePressed: {
    opacity: 0.8,
  },
  searchContainer: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    height: 44,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    color: "#0b0b0b",
    flex: 1,
    fontSize: 14,
    height: "100%",
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemRowSelected: {
    borderColor: "#0b0b0b",
    borderWidth: 1.5,
  },
  itemRowPressed: {
    opacity: 0.84,
  },
  itemText: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "600",
  },
  itemTextSelected: {
    fontWeight: "700",
  },
  emptyText: {
    color: "#555555",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
  },
});
