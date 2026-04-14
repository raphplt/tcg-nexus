import {
  jsx as _jsx,
  Fragment as _Fragment,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
export default function RootLayout() {
  return _jsxs(_Fragment, {
    children: [
      _jsx(StatusBar, { style: "auto" }),
      _jsx(Stack, {
        children: _jsx(Stack.Screen, {
          name: "(tabs)",
          options: { headerShown: false },
        }),
      }),
    ],
  });
}
