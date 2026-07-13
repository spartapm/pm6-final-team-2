import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALLBLU",
  description: "본 작품, 볼 작품, 다시 보고 싶은 작품을 모아두는 애니·웹툰 아카이브",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const GTM_ID = "GTM-WL6VRGK4";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <Script id="gtm" strategy="beforeInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}</Script>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <div className="app-shell mx-auto min-h-[100svh] max-w-[1200px] bg-white shadow-panel">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
