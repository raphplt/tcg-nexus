import type { ConfigContext, ExpoConfig } from "expo/config";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:3001/api";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TCG Nexus",
  slug: "tcg-nexus",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "tcgnexus",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#f7f1e8",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tcgnexus.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#f7f1e8",
    },
    package: "com.tcgnexus.app",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    ...config.extra,
    apiUrl,
  },
} as ExpoConfig);
