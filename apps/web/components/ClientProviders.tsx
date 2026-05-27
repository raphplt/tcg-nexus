"use client";

import { ReactNode } from "react";
import { ReactQueryProvider } from "@/contexts/QueryClientContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster } from "react-hot-toast";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <AuthProvider>
        <NotificationProvider>
          {children}
          <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
}
