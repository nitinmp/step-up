import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        rank: {
          1: "rgb(var(--rank-1) / <alpha-value>)",
          2: "rgb(var(--rank-2) / <alpha-value>)",
          3: "rgb(var(--rank-3) / <alpha-value>)",
        },
        success: {
          600: "rgb(var(--success-600) / <alpha-value>)",
        },
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-dark": "rgb(var(--brand-dark) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        "medal-gold": "rgb(var(--medal-gold) / <alpha-value>)",
        "medal-silver": "rgb(var(--medal-silver) / <alpha-value>)",
        "medal-bronze": "rgb(var(--medal-bronze) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
