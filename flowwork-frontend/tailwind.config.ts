import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0e17",
        foreground: "#f4f6fb",
        surface: {
          DEFAULT: "rgba(255,255,255,0.04)",
          hover: "rgba(255,255,255,0.07)",
          border: "rgba(255,255,255,0.08)",
          borderHover: "rgba(255,255,255,0.16)",
        },
        muted: {
          DEFAULT: "#7d8aa3",
          foreground: "#9aa4b8",
        },
        flow: {
          teal: "#00f0ff",
          violet: "#7c3aed",
          magenta: "#ec4899",
        },
        tier: {
          bronze: "#c08552",
          silver: "#c7ccd8",
          gold: "#f0c25b",
          platinum: "#bfe9ff",
        },
        success: "#5dcaa5",
        warning: "#f0c25b",
        danger: "#e24b4a",
        info: "#378add",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "flow-gradient":
          "linear-gradient(135deg, #00f0ff 0%, #7c3aed 50%, #ec4899 100%)",
        "flow-gradient-soft":
          "linear-gradient(135deg, rgba(0,240,255,0.15) 0%, rgba(124,58,237,0.15) 50%, rgba(236,72,153,0.15) 100%)",
        "mesh-1":
          "radial-gradient(circle at 20% 20%, rgba(0,240,255,0.18), transparent 50%), radial-gradient(circle at 80% 30%, rgba(124,58,237,0.16), transparent 50%), radial-gradient(circle at 50% 80%, rgba(236,72,153,0.15), transparent 50%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 0 24px rgba(124,58,237,0.35)",
        "glow-teal": "0 0 24px rgba(0,240,255,0.3)",
        "glow-magenta": "0 0 24px rgba(236,72,153,0.3)",
      },
      keyframes: {
        "mesh-drift": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(2%, 3%) scale(1.05)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "mesh-drift": "mesh-drift 18s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
