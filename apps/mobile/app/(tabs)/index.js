import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StyleSheet, Text, View } from "react-native";
export default function HomeScreen() {
    return (_jsxs(View, { style: styles.container, children: [_jsx(Text, { style: styles.title, children: "TCG Nexus" }), _jsx(Text, { style: styles.subtitle, children: "Bienvenue sur l'application mobile" })] }));
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
});
