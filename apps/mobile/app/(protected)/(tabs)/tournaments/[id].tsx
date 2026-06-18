import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TournamentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "matches" | "standings">("details");

  const isAdminOrModerator = user?.role === "admin" || user?.role === "moderator";

  const loadTournamentDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [tournamentData, statsData, matchesData, rankingsData] = await Promise.all([
        tournamentService.getTournamentById(Number(id)),
        tournamentService.getTournamentStats(Number(id)).catch(() => null),
        tournamentService.getTournamentMatches(Number(id)).then(res => res?.matches || []).catch(() => []),
        tournamentService.getTournamentRankings(Number(id)).catch(() => []),
      ]);
      setTournament(tournamentData);
      setStats(statsData);
      setMatches(matchesData);
      setRankings(rankingsData);
    } catch (err) {
      setError("Impossible de charger les détails du tournoi.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTournamentDetails();
    }
  }, [id]);

  const handleJoin = async () => {
    if (!user?.player?.id) {
      Alert.alert("Erreur", "Vous devez avoir un profil joueur pour participer.");
      return;
    }
    
    try {
      setIsJoining(true);
      await tournamentService.registerTournament(Number(id), user.player.id);
      Alert.alert("Succès", "Vous êtes inscrit à ce tournoi !");
      await loadTournamentDetails();
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.message || "Impossible de rejoindre le tournoi.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await tournamentService.updateTournamentStatus(Number(id), newStatus);
      Alert.alert("Succès", `Le statut du tournoi a été mis à jour.`);
      await loadTournamentDetails();
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.message || "Impossible de mettre à jour le statut.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d95f4d" />
      </View>
    );
  }

  if (error || !tournament) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error || "Tournoi non trouvé."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(tournament.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(tournament.status) },
              ]}
            >
              {getStatusLabel(tournament.status)}
            </Text>
          </View>
          <Text style={styles.typeText}>
            {tournament.type === "swiss_system"
              ? "Système Suisse"
              : tournament.type === "single_elimination"
              ? "Élimination directe"
              : tournament.type}
          </Text>
        </View>

        <Text style={styles.title}>{tournament.name}</Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={16} color="#7c6a58" />
            <Text style={styles.metaText}>
              Du {formatDate(tournament.startDate)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color="#7c6a58" />
            <Text style={styles.metaText}>
              Au {formatDate(tournament.endDate)}
            </Text>
          </View>
          {tournament.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color="#7c6a58" />
              <Text style={styles.metaText}>{tournament.location}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === "details" && styles.tabButtonActive]}
          onPress={() => setActiveTab("details")}
        >
          <Text style={[styles.tabButtonText, activeTab === "details" && styles.tabButtonTextActive]}>Détails</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "matches" && styles.tabButtonActive]}
          onPress={() => setActiveTab("matches")}
        >
          <Text style={[styles.tabButtonText, activeTab === "matches" && styles.tabButtonTextActive]}>Matchs</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "standings" && styles.tabButtonActive]}
          onPress={() => setActiveTab("standings")}
        >
          <Text style={[styles.tabButtonText, activeTab === "standings" && styles.tabButtonTextActive]}>Classement</Text>
        </Pressable>
      </View>

      {/* Détails Tab */}
      {activeTab === "details" && (
        <View>
          {/* Stats Quick View */}
          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.totalPlayers || 0}</Text>
                <Text style={styles.statLabel}>Joueurs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {stats.currentRound || 0} / {stats.totalRounds || "-"}
                </Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.completedMatches || 0}</Text>
                <Text style={styles.statLabel}>Matchs finis</Text>
              </View>
            </View>
          )}

          {/* Description */}
          {tournament.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.bodyText}>{tournament.description}</Text>
            </View>
          )}

          {/* Règles */}
          {tournament.rules && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Règles du tournoi</Text>
              <Text style={styles.bodyText}>{tournament.rules}</Text>
            </View>
          )}

          {/* Additional Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations complémentaires</Text>
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Visibilité :</Text>
                <Text style={styles.infoValue}>
                  {tournament.isPublic ? "Public" : "Privé"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Approbation requise :</Text>
                <Text style={styles.infoValue}>
                  {tournament.requiresApproval ? "Oui" : "Non"}
                </Text>
              </View>
              {tournament.registrationDeadline && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fin des inscriptions :</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(tournament.registrationDeadline)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bouton d'inscription pour les joueurs */}
          {tournament.status === "registration_open" && !isAdminOrModerator && (
            <View style={styles.actionContainer}>
              <Pressable 
                style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
                onPress={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator color="#fff8f3" />
                ) : (
                  <Text style={styles.joinButtonText}>Rejoindre le tournoi</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Boutons d'administration */}
          {isAdminOrModerator && (
            <View style={styles.adminContainer}>
              <Text style={styles.adminTitle}>Administration</Text>
              <View style={styles.adminButtons}>
                {tournament.status === "draft" && (
                  <Pressable
                    style={[styles.adminButton, isUpdatingStatus && styles.adminButtonDisabled]}
                    onPress={() => handleUpdateStatus("registration_open")}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={styles.adminButtonText}>Ouvrir les inscriptions</Text>
                  </Pressable>
                )}
                {tournament.status === "registration_open" && (
                  <Pressable
                    style={[styles.adminButton, styles.adminButtonSecondary, isUpdatingStatus && styles.adminButtonDisabled]}
                    onPress={() => handleUpdateStatus("registration_closed")}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={styles.adminButtonTextSecondary}>Fermer les inscriptions</Text>
                  </Pressable>
                )}
                {tournament.status === "registration_closed" && (
                  <Pressable
                    style={[styles.adminButton, isUpdatingStatus && styles.adminButtonDisabled]}
                    onPress={() => handleUpdateStatus("in_progress")}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={styles.adminButtonText}>Démarrer le tournoi</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Matchs Tab */}
      {activeTab === "matches" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matchs</Text>
          {matches.length === 0 ? (
            <Text style={styles.bodyText}>Aucun match généré pour le moment.</Text>
          ) : (
            matches.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchHeader}>
                  <Text style={styles.matchRound}>Round {match.round}</Text>
                  <Text style={styles.matchStatus}>
                    {match.status === "finished" ? "Terminé" : "En attente"}
                  </Text>
                </View>
                <View style={styles.matchPlayers}>
                  <View style={styles.matchPlayer}>
                    <Text style={[styles.matchPlayerName, match.winner?.id === match.playerA?.id && styles.matchWinner]}>
                      {match.playerA?.user?.username || `Joueur ${match.playerA?.id || 'A'}`}
                    </Text>
                    <Text style={styles.matchScore}>{match.playerAScore ?? "-"}</Text>
                  </View>
                  <View style={styles.matchDivider} />
                  <View style={styles.matchPlayer}>
                    <Text style={[styles.matchPlayerName, match.winner?.id === match.playerB?.id && styles.matchWinner]}>
                      {match.playerB?.user?.username || `Joueur ${match.playerB?.id || 'B'}`}
                    </Text>
                    <Text style={styles.matchScore}>{match.playerBScore ?? "-"}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Classement Tab */}
      {activeTab === "standings" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classement actuel</Text>
          {rankings.length === 0 ? (
            <Text style={styles.bodyText}>Aucun classement disponible.</Text>
          ) : (
            <View style={styles.standingsContainer}>
              <View style={styles.standingsHeader}>
                <Text style={[styles.standingsCell, styles.standingsRank]}>#</Text>
                <Text style={[styles.standingsCell, styles.standingsName]}>Joueur</Text>
                <Text style={[styles.standingsCell, styles.standingsScore]}>V-D</Text>
                <Text style={[styles.standingsCell, styles.standingsPoints]}>Pts</Text>
              </View>
              {rankings.map((ranking) => (
                <View key={ranking.id} style={styles.standingsRow}>
                  <Text style={[styles.standingsCell, styles.standingsRank]}>{ranking.rank}</Text>
                  <Text style={[styles.standingsCell, styles.standingsName]} numberOfLines={1}>
                    {ranking.player?.user?.username || "Inconnu"}
                  </Text>
                  <Text style={[styles.standingsCell, styles.standingsScore]}>
                    {ranking.wins}-{ranking.losses}
                  </Text>
                  <Text style={[styles.standingsCell, styles.standingsPoints]}>{ranking.points}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  adminContainer: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 20,
    padding: 16,
  },
  adminTitle: {
    color: "#15233b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  adminButtons: {
    gap: 8,
  },
  adminButton: {
    backgroundColor: "#15233b",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  adminButtonSecondary: {
    backgroundColor: "transparent",
    borderColor: "#15233b",
    borderWidth: 1,
  },
  adminButtonDisabled: {
    opacity: 0.5,
  },
  adminButtonText: {
    color: "#fff8f3",
    fontSize: 14,
    fontWeight: "700",
  },
  adminButtonTextSecondary: {
    color: "#15233b",
    fontSize: 14,
    fontWeight: "700",
  },
  bodyText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
  },
  footerNote: {
    backgroundColor: "#e8f0fe",
    borderRadius: 12,
    marginTop: 24,
    padding: 16,
  },
  footerNoteText: {
    color: "#1e40af",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  headerCard: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 20,
  },
  headerTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    color: "#7c6a58",
    fontSize: 14,
    fontWeight: "500",
    width: 150,
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
  },
  infoValue: {
    color: "#15233b",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  metaContainer: {
    gap: 8,
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  metaText: {
    color: "#475569",
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: "#d95f4d",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonDisabled: {
    backgroundColor: "#d95f4d80",
  },
  joinButtonText: {
    color: "#fff8f3",
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    color: "#15233b",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 16,
  },
  statLabel: {
    color: "#7c6a58",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  statValue: {
    color: "#15233b",
    fontSize: 20,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
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
  title: {
    color: "#15233b",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
  },
  typeText: {
    color: "#7c6a58",
    fontSize: 12,
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#e8dcd0",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#fffdf9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7c6a58",
  },
  tabButtonTextActive: {
    color: "#15233b",
    fontWeight: "800",
  },
  matchCard: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eadfd3",
    paddingBottom: 8,
  },
  matchRound: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7c6a58",
  },
  matchStatus: {
    fontSize: 12,
    color: "#475569",
  },
  matchPlayers: {
    gap: 4,
  },
  matchPlayer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchPlayerName: {
    fontSize: 15,
    color: "#15233b",
    fontWeight: "600",
  },
  matchWinner: {
    color: "#10b981",
    fontWeight: "800",
  },
  matchScore: {
    fontSize: 16,
    fontWeight: "800",
    color: "#15233b",
  },
  matchDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 4,
  },
  standingsContainer: {
    backgroundColor: "#fffdf9",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eadfd3",
  },
  standingsHeader: {
    flexDirection: "row",
    backgroundColor: "#f7f1e8",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eadfd3",
  },
  standingsRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  standingsCell: {
    fontSize: 14,
    color: "#15233b",
  },
  standingsRank: {
    width: 40,
    textAlign: "center",
    fontWeight: "700",
  },
  standingsName: {
    flex: 1,
    fontWeight: "600",
  },
  standingsScore: {
    width: 60,
    textAlign: "center",
    color: "#475569",
  },
  standingsPoints: {
    width: 50,
    textAlign: "center",
    fontWeight: "800",
  },
});
