"use client";

import { AllbluProvider } from "@/lib/useAllbluState";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AllbluProvider>{children}</AllbluProvider>;
}
