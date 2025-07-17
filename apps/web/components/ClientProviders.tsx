"use client";

import { ReactNode } from "react";
import { ReactQueryProvider } from "@/contexts/QueryClientContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </ReactQueryProvider>
  );
} 