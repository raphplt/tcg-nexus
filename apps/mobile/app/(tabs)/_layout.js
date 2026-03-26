import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
function TabIcon({ name, color, size }) {
    return _jsx(Ionicons, { name: name, size: size, color: color });
}
export default function TabLayout() {
    return (_jsxs(Tabs, { screenOptions: {
            tabBarActiveTintColor: "#6366f1",
            headerStyle: { backgroundColor: "#6366f1" },
            headerTintColor: "#fff",
        }, children: [_jsx(Tabs.Screen, { name: "index", options: {
                    title: "Accueil",
                    tabBarIcon: ({ color, size }) => (_jsx(TabIcon, { name: "home", size: size, color: color })),
                } }), _jsx(Tabs.Screen, { name: "collection", options: {
                    title: "Collection",
                    tabBarIcon: ({ color, size }) => (_jsx(TabIcon, { name: "albums", size: size, color: color })),
                } }), _jsx(Tabs.Screen, { name: "marketplace", options: {
                    title: "Marketplace",
                    tabBarIcon: ({ color, size }) => (_jsx(TabIcon, { name: "cart", size: size, color: color })),
                } }), _jsx(Tabs.Screen, { name: "profile", options: {
                    title: "Profil",
                    tabBarIcon: ({ color, size }) => (_jsx(TabIcon, { name: "person", size: size, color: color })),
                } })] }));
}
