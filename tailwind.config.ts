import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070A12",
          900: "#0B0F19",
          850: "#101624",
          800: "#151C2C",
          750: "#1A2234",
          700: "#202A40",
          600: "#2C3852",
        },
        saffron: {
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
        },
        rose: {
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
        },
        cream: "#F8F4EA",
      },
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "var(--font-noto-devanagari)",
          "Noto Sans Devanagari",
          "Nirmala UI",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-jakarta)",
          "var(--font-noto-devanagari)",
          "Noto Sans Devanagari",
          "Nirmala UI",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(245,158,11,0.18), 0 18px 60px -20px rgba(245,158,11,0.35)",
        card: "0 24px 60px -32px rgba(0,0,0,0.9)",
        drawer: "-30px 0 80px -20px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(120% 120% at 80% 0%, rgba(245,158,11,0.18) 0%, rgba(11,15,25,0) 55%), radial-gradient(90% 90% at 0% 100%, rgba(225,29,72,0.16) 0%, rgba(11,15,25,0) 60%)",
        "card-shine":
          "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0) 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.35s ease-out both",
        "slide-in": "slide-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
