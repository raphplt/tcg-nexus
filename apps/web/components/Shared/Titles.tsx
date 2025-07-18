import React from "react";
import clsx from "clsx";

interface TitleProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "muted" | "primary";
}

function getColor(variant?: string) {
  if (variant === "muted") return "text-muted-foreground";
  if (variant === "primary") return "text-primary";
  return "text-black";
}

export function H1({ children, className, variant = "default" }: TitleProps) {
  return (
    <h1
      className={clsx(
        "text-3xl font-extrabold tracking-tight font-sans md:text-4xl",
        getColor(variant),
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function H2({ children, className, variant = "default" }: TitleProps) {
  return (
    <h2
      className={clsx(
        "text-2xl font-bold tracking-tight font-sans md:text-3xl",
        getColor(variant),
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function H3({ children, className, variant = "default" }: TitleProps) {
  return (
    <h3
      className={clsx(
        "text-xl font-bold tracking-tight font-sans md:text-2xl",
        getColor(variant),
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function H4({ children, className, variant = "default" }: TitleProps) {
  return (
    <h4
      className={clsx(
        "text-lg font-semibold tracking-tight font-sans md:text-xl",
        getColor(variant),
        className,
      )}
    >
      {children}
    </h4>
  );
}

export function H5({ children, className, variant = "default" }: TitleProps) {
  return (
    <h5
      className={clsx(
        "text-base font-semibold tracking-tight font-sans md:text-lg",
        getColor(variant),
        className,
      )}
    >
      {children}
    </h5>
  );
}
