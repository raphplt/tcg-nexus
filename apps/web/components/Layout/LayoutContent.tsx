"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Header from "./Header";
import Footer from "./Footer";
import { Toaster } from "react-hot-toast";

const PathnameWrapper = dynamic(() => import("./PathnameWrapper"), {
  ssr: false,
});

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  return (
    <>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <PathnameWrapper>{children}</PathnameWrapper>
      <Toaster />
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
