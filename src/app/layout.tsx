import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALLBLU",
  description: "애니와 웹툰을 다시 보고 싶은 순간에 모아보는 MVP",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <div className="app-shell mx-auto min-h-[100svh] max-w-[1180px] bg-white shadow-panel">
          {children}
        </div>
      </body>
    </html>
  );
}
