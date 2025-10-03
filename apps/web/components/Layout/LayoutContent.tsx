"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import { Toaster } from "react-hot-toast";
import { FULLSCREEN_PATHS } from "@/utils/constants";

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const currentPath = usePathname();
  const isFullscreenPath = FULLSCREEN_PATHS.includes(currentPath);

  return (
    <>
      <Header />
      <div className={isFullscreenPath ? "min-h-screen" : "mt-16 min-h-screen"}>
        {children}
      </div>
      <Toaster />
      <Footer />
    </>
  );
}
