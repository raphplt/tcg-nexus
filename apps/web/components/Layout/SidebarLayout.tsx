"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import Footer from "./Footer";
import { Toaster } from "react-hot-toast";

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <div className="flex-1 overflow-auto">{children}</div>
        <Footer />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
