import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Warm, friendly palette — no clinical whites or corporate blues
        cream: "#FBF7F0",
        sand: "#F3E9DA",
        clay: "#E8D5C0",
        coral: {
          DEFAULT: "#E8826B",
          dark: "#D2654C",
          light: "#F4A893",
        },
        sage: {
          DEFAULT: "#7BA38C",
          dark: "#5E866F",
          light: "#A6C4B3",
        },
        sunbeam: "#F2C879",
        ink: "#3D3530",
        muted: "#7A6F66",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(61, 53, 48, 0.08)",
        lift: "0 12px 32px -4px rgba(61, 53, 48, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
