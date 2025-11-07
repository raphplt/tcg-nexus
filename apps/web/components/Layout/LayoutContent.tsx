"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import { Toaster } from "react-hot-toast";
import { FULLSCREEN_PATHS } from "@/utils/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const currentPath = usePathname();
  const isFullscreenPath = FULLSCREEN_PATHS.includes(currentPath);

  return (
    <>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <div className={isFullscreenPath ? "min-h-screen" : "mt-16 min-h-screen"}>
        <Suspense
          fallback={
            <div className="flex flex-col gap-6 max-w-7xl mx-auto py-12 px-4">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
      <Toaster />
      <Footer />
    </>
  );
}
