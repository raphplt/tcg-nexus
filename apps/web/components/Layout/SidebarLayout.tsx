"use client";

import { Toaster } from "react-hot-toast";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import Footer from "./Footer";
import { TopBar } from "./TopBar";

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <TopBar />
        <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
        <Footer />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
