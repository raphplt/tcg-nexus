import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { colors } from "@/constants/theme";

// overlay affiché pendant l'analyse : photo figée + ligne de scan animée
export function ProcessingOverlay({ uri }: { uri: string | null }) {
  const { height } = useWindowDimensions();
  const sweep = useRef(new Animated.Value(0)).current;
  // fondu d'apparition : évite le flash sec quand l'overlay recouvre la caméra
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, fade]);

  const translateY = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height],
  });

  return (
    <Animated.View style={[styles.processingScreen, { opacity: fade }]}>
      {uri ? (
        <Image
          blurRadius={3}
          resizeMode="cover"
          source={{ uri }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.processingDim} />
      <Animated.View
        style={[styles.scanLine, { transform: [{ translateY }] }]}
      />
      <View style={styles.processingInfo}>
        <ActivityIndicator color={colors.primaryForeground} size="large" />
        <Text style={styles.processingTitle}>Analyse de la carte…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  processingScreen: {
    alignItems: "center",
    backgroundColor: colors.heroDark,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  processingDim: {
    backgroundColor: "rgba(11,11,11,0.6)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scanLine: {
    backgroundColor: colors.primary,
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    top: 0,
  },
  processingInfo: {
    alignItems: "center",
    gap: 14,
  },
  processingTitle: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
});
