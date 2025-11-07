"use client";

import { ReactNode } from "react";
import { ReactQueryProvider } from "@/contexts/QueryClientContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AchievementNotificationProvider } from "@/components/Achievement";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <AuthProvider>
        <AchievementNotificationProvider>
          {children}
        </AchievementNotificationProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
}
