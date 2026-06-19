import type { ConfigContext, ExpoConfig } from "expo/config";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:3001/api";

export default (_: ConfigContext): ExpoConfig => ({
  name: "TCG Nexus",
  slug: "tcg-nexus-mobile",
  owner: "tcg-nexus",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "tcgnexus",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tcgnexus.app",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#f7f1e8",
    },
    permissions: ["CAMERA"],
    package: "com.tcgnexus.app",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission:
          "Permettre à TCG Nexus d'utiliser votre caméra pour scanner vos cartes Pokémon.",
      },
    ],
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#f7f1e8",
      },
    ],
    "expo-status-bar",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#f7f1e8",
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    router: {},
    eas: {
      projectId: "030d0c32-9e1b-4b01-a864-2cd2e908dcac",
    },
    apiUrl,
  },
});
