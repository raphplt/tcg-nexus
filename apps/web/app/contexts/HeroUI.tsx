"use client";
import { HeroUIProvider } from "@heroui/react";
import React from "react";

type HeroUIProps = {
  children: React.ReactNode;
};

const HeroUI = ({ children }: HeroUIProps) => {
  return <HeroUIProvider>{children}</HeroUIProvider>;
};

export default HeroUI;
