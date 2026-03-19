import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StyleSheet, Text, View } from "react-native";
export default function ProfileScreen() {
  return _jsxs(View, {
    style: styles.container,
    children: [
      _jsx(Text, { style: styles.title, children: "Mon Profil" }),
      _jsx(Text, {
        style: styles.subtitle,
        children: "G\u00E9rez votre compte",
      }),
    ],
  });
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
