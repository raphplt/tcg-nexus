import { heroui } from "@heroui/react";

export const content = [
  "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
];
export const theme = {
  extend: {
    colors: {
      primary: "#b80c09ff",
      secondary: "#0b4f6cff",
      success: "#01baefff",
      warning: "#fbfbffff",
      info: "#040f16ff",
    },
    backgroundImage: {
      "gradient-top":
        "linear-gradient(0deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-right":
        "linear-gradient(90deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-bottom":
        "linear-gradient(180deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-left":
        "linear-gradient(270deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-top-right":
        "linear-gradient(45deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-bottom-right":
        "linear-gradient(135deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-top-left":
        "linear-gradient(225deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-bottom-left":
        "linear-gradient(315deg, #b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
      "gradient-radial":
        "radial-gradient(#b80c09ff, #0b4f6cff, #fbfbffff, #01baefff, #040f16ff)",
    },
  },
};
export const darkMode = "class";
export const plugins = [
  heroui({
    defaultTheme: "light",

    themes: {
      light: {
        colors: {
          background: "#FFFFFF",
          primary: {
            DEFAULT: "#b80c09ff",
            foreground: "#FFFFFF",
          },
          secondary: "#0b4f6cff",
          success: "#01baefff",
          warning: "#fbfbffff",
          info: "#040f16ff",
        },
      },
      dark: {
        colors: {
          background: "#161C24",
          primary: {
            DEFAULT: "#b80c09ff",
            foreground: "#FFFFFF",
          },
          secondary: "#0b4f6cff",
          success: "#01baefff",
          warning: "#fbfbffff",
          info: "#040f16ff",
        },
      },
    },
  }),
];