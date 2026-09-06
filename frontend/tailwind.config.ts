import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07070d",
          900: "#0b0b12",
          850: "#101019",
          800: "#161623",
          700: "#20202f",
          600: "#2a2a3c",
          500: "#3a3a52",
          400: "#5a5a76",
          300: "#8a8aa5",
          200: "#c4c4d6",
          100: "#e8e8f2",
        },
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
        },
        accent: {
          magenta: "#ec4899",
          indigo: "#6366f1",
          cyan: "#22d3ee",
        },
      },
      fontFamily: {
        sans: [
          "InterVariable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(139,92,246,0.55)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "studio-radial":
          "radial-gradient(80rem 40rem at 20% -10%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(60rem 30rem at 90% 10%, rgba(236,72,153,0.14), transparent 60%)",
        "brand-gradient":
          "linear-gradient(135deg, #8b5cf6 0%, #6366f1 45%, #ec4899 100%)",
      },
      animation: {
        "pulse-slow": "pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
