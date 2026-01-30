"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FULLSCREEN_PATHS } from "@/utils/constants";

interface PathnameWrapperProps {
  children: React.ReactNode;
}

export default function PathnameWrapper({ children }: PathnameWrapperProps) {
  const pathname = usePathname();
  const [isFullscreenPath, setIsFullscreenPath] = useState(false);

  useEffect(() => {
    if (pathname) {
      setIsFullscreenPath(FULLSCREEN_PATHS.includes(pathname));
    }
  }, [pathname]);

  return (
    <div className={isFullscreenPath ? "" : "mt-16"}>
      {children}
    </div>
  );
}

