import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { Link } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/contexts/AuthProvider";
import { tournamentService } from "@/services/tournament.service";
import type { Tournament } from "@/types";

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return "#64748b";
    case "registration_open":
      return "#10b981";
    case "registration_closed":
      return "#f59e0b";
    case "in_progress":
      return "#3b82f6";
    case "finished":
      return "#15233b";
    case "cancelled":
      return "#ef4444";
    default:
      return "#64748b";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "registration_open":
      return "Inscriptions ouvertes";
    case "registration_closed":
      return "Inscriptions fermées";
    case "in_progress":
      return "En cours";
    case "finished":
      return "Terminé";
    case "cancelled":
      return "Annulé";
    default:
      return status;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function TournamentsScreen() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "upcoming" | "past" | "my_tournaments"
  >("upcoming");

  const loadTournaments = async () => {
    try {
      setError(null);
      let data: Tournament[] = [];
      if (filter === "upcoming") {
        data = await tournamentService.getUpcomingTournaments(20);
      } else if (filter === "past") {
        data = await tournamentService.getPastTournaments(20);
      } else if (filter === "my_tournaments" && user?.player?.id) {
        const response = await tournamentService.getPlayerTournaments(
          user.player.id,
          { limit: 20 },
        );
        data = response.data;
      } else {
        const response = await tournamentService.getTournaments({ limit: 20 });
        data = response.data;
      }
      setTournaments(data);
    } catch (err: any) {
      setError("Impossible de charger les tournois.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTournaments();
    }, [filter]),
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadTournaments();
  };

  const renderItem = ({ item }: { item: Tournament }) => (
    <Link href={`/tournaments/${item.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#7c6a58" />
            <Text style={styles.detailText}>{formatDate(item.startDate)}</Text>
          </View>
          {item.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color="#7c6a58" />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color="#7c6a58" />
            <Text style={styles.detailText}>
              {item.players?.length || 0}
              {item.maxPlayers ? ` / ${item.maxPlayers}` : ""} joueurs
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Pressable
          style={[
            styles.filterButton,
            filter === "upcoming" && styles.filterButtonActive,
          ]}
          onPress={() => {
            setIsLoading(true);
            setFilter("upcoming");
          }}
        >
          <Text
            style={[
              styles.filterText,
              filter === "upcoming" && styles.filterTextActive,
            ]}
          >
            À venir
          </Text>
        </Pressable>
        {user?.player?.id && (
          <Pressable
            style={[
              styles.filterButton,
              filter === "my_tournaments" && styles.filterButtonActive,
            ]}
            onPress={() => {
              setIsLoading(true);
              setFilter("my_tournaments");
            }}
          >
            <Text
              style={[
                styles.filterText,
                filter === "my_tournaments" && styles.filterTextActive,
              ]}
            >
              Mes tournois
            </Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.filterButton,
            filter === "all" && styles.filterButtonActive,
          ]}
          onPress={() => {
            setIsLoading(true);
            setFilter("all");
          }}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            Tous
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            filter === "past" && styles.filterButtonActive,
          ]}
          onPress={() => {
            setIsLoading(true);
            setFilter("past");
          }}
        >
          <Text
            style={[
              styles.filterText,
              filter === "past" && styles.filterTextActive,
            ]}
          >
            Passés
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#d95f4d" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : tournaments.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={48} color="#eadfd3" />
          <Text style={styles.emptyText}>Aucun tournoi trouvé</Text>
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDetails: {
    gap: 6,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#15233b",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#f7f1e8",
    flex: 1,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  detailText: {
    color: "#7c6a58",
    fontSize: 13,
  },
  emptyText: {
    color: "#7c6a58",
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  filterButton: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButtonActive: {
    backgroundColor: "#15233b",
    borderColor: "#15233b",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
  },
  filterText: {
    color: "#7c6a58",
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff8f3",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  retryButton: {
    backgroundColor: "#15233b",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: "#fff8f3",
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
