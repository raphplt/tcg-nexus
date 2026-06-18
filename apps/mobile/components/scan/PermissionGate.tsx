import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius } from "@/constants/theme";

interface PermissionGateProps {
  granted: boolean;
  onRequest: () => void;
}

export function PermissionLoading() {
  return (
    <View style={styles.centeredScreen}>
      <ActivityIndicator color={colors.foreground} size="large" />
    </View>
  );
}

export function PermissionRequest({
  onRequest,
}: Pick<PermissionGateProps, "onRequest">) {
  return (
    <View style={styles.permissionScreen}>
      <Text style={styles.permissionTitle}>Appareil photo requis</Text>
      <Text style={styles.permissionText}>
        Autorise l'appareil photo pour scanner tes cartes.
      </Text>
      <Pressable onPress={onRequest} style={styles.permissionButton}>
        <Text style={styles.permissionButtonText}>
          Autoriser l'appareil photo
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.back()}
        style={styles.permissionSecondaryButton}
      >
        <Text style={styles.permissionSecondaryText}>Retour</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredScreen: {
    alignItems: "center",
    backgroundColor: colors.pageBg,
    flex: 1,
    justifyContent: "center",
  },
  permissionScreen: {
    alignItems: "center",
    backgroundColor: colors.pageBg,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  permissionTitle: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  permissionText: {
    color: colors.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  permissionButtonText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: "700",
  },
  permissionSecondaryButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  permissionSecondaryText: {
    color: colors.foreground,
    fontWeight: "700",
  },
});
