"use client";

import { AllbluProvider } from "@/lib/useAllbluState";
import AnalyticsBridge from "./AnalyticsBridge";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AllbluProvider>
      <AnalyticsBridge />
      {children}
    </AllbluProvider>
  );
}
