import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1C1917",
          soft: "#3F3A36",
          mute: "#6B6259",
        },
        paper: {
          DEFAULT: "#FAF6F0",
          warm: "#F2EADC",
          deep: "#E7D7C1",
        },
        terracotta: {
          DEFAULT: "#C2410C",
          deep: "#9A330A",
          soft: "#F4A582",
        },
        moss: {
          DEFAULT: "#4D7C0F",
          soft: "#A3C26A",
        },
        sky: {
          DEFAULT: "#1E5F8B",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 7vw, 5.75rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.25rem, 5vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
      boxShadow: {
        soft: "0 1px 0 rgba(28, 25, 23, 0.04), 0 8px 24px -8px rgba(28, 25, 23, 0.12)",
        edge: "inset 0 0 0 1px rgba(28, 25, 23, 0.08)",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "14px",
        xl: "22px",
      },
      animation: {
        "fade-up": "fade-up 700ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 600ms ease-out both",
        marquee: "marquee 38s linear infinite",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;