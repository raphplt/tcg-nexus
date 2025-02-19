// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
	content: [
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				white: "#FFFFFF",
				black: "#000000",
				cyan: "#1FACC8",
				navy: "#252477",
				teal: "#2B8091",
				violet: "#433FD3",
				blue: "#55ACBD",
				indigo: "#7370D7",
				gold: "#BF8733",
				amber: "#EAAD53",
				sand: "#EEBE76",
				background: "#FFFFFF",
				foreground: "#000000",
			},
		},
	},
	darkMode: "class",
} satisfies Config;
