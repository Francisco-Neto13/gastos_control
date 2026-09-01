import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b7cdff",
          300: "#8aabff",
          400: "#5c84ff",
          500: "#3660f5",
          600: "#2647d1",
          700: "#1f38a8",
          800: "#1c3187",
          900: "#1a2c6e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
