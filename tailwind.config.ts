import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#1f5eff",
        brandDeep: "#0b2a6b",
        navy: "#0c1f4a",
        navyDeep: "#071433",
        blueSoft: "#eef4ff",
        surface: "#f5f6f8",
        search: "#eef0f4",
        slateCard: "#d7dde8",
        line: "#e5e7eb",
        ink: "#111827",
        muted: "#6b7280",
        footer: "#111111",
      },
      boxShadow: {
        panel: "0 14px 40px rgba(15, 23, 42, 0.08)",
        menu: "0 12px 28px rgba(15, 23, 42, 0.14)",
        card: "0 4px 16px rgba(15, 23, 42, 0.06)",
      },
      borderRadius: {
        thumb: "14px",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
