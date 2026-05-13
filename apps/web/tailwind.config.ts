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
        background: "#F8F3EA",
        foreground: "#4B2E2B",
        primary: {
          DEFAULT: "#C96B3B",
          light: "#D97C5C",
          dark: "#B05A2E",
        },
        secondary: {
          DEFAULT: "#E8B08A",
          light: "#F2C9AE",
          dark: "#D4966A",
        },
        success: {
          DEFAULT: "#7A9E7E",
          light: "#9AB89E",
        },
        warning: {
          DEFAULT: "#D97C5C",
          light: "#E8A07E",
        },
        danger: {
          DEFAULT: "#C0574A",
          light: "#D4776C",
        },
        card: "#FFFDF8",
        sidebar: "#F4EBDD",
        border: "#E8DED1",
        muted: "#9A7B6E",
        "text-primary": "#4B2E2B",
        "text-muted": "#9A7B6E",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 24px -2px rgba(75, 46, 43, 0.08)',
        'glass': '0 8px 32px 0 rgba(201, 107, 59, 0.06)',
        'warm': '0 2px 16px -4px rgba(201, 107, 59, 0.15)',
        'card': '0 4px 32px -8px rgba(75, 46, 43, 0.10)',
        'elevated': '0 12px 40px -8px rgba(75, 46, 43, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
export default config;
