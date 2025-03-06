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
      gradient: {
        top: "linear-gradient(0deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        right:
          "linear-gradient(90deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        bottom:
          "linear-gradient(180deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        left: "linear-gradient(270deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        topRight:
          "linear-gradient(45deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        bottomRight:
          "linear-gradient(135deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        topLeft:
          "linear-gradient(225deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        bottomLeft:
          "linear-gradient(315deg, #b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
        radial: "radial-gradient(#b09e99, #fee9e1, #fad4c0, #64b6ac, #c0fdfb)",
      },
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
          primary: "#b09e99",
          secondary: "#fee9e1",
          success: "#64b6ac",
          warning: "#fad4c0",
          info: "#c0fdfb",
        },
      },
      dark: {
        colors: {
          background: "#161C24",
          primary: "#b09e99",
          secondary: "#fee9e1",
          success: "#64b6ac",
          warning: "#fad4c0",
          info: "#c0fdfb",
        },
      },
    },
  }),
];
