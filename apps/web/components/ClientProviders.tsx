"use client";

import { ReactNode } from "react";
import { ReactQueryProvider } from "@/contexts/QueryClientContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserTournamentsProvider } from "@/contexts/UserTournamentsContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <AuthProvider>
        <UserTournamentsProvider>{children}</UserTournamentsProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
} 