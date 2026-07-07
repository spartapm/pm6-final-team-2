import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0d2b55",
        navyDeep: "#061935",
        blueSoft: "#eef4ff",
        slateCard: "#cbd5e1",
        line: "#d9dee8",
        ink: "#171717",
        muted: "#6b7280",
      },
      boxShadow: {
        panel: "0 14px 40px rgba(15, 23, 42, 0.08)",
        menu: "0 12px 30px rgba(15, 23, 42, 0.16)",
      },
      fontFamily: {
        sans: ["Pretendard", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
