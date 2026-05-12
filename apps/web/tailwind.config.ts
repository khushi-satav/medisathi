import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F5F7FB",
        foreground: "#111827",
        primary: {
          DEFAULT: "#6C63FF",
          light: "#8278FF",
          dark: "#554DCC",
        },
        secondary: {
          DEFAULT: "#8B5CF6",
          light: "#A78BFA",
          dark: "#7C3AED",
        },
        success: {
          DEFAULT: "#10B981",
          light: "#34D399",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#F87171",
        },
        card: "#FFFFFF",
        muted: "#6B7280",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
    },
  },
  plugins: [],
};
export default config;
