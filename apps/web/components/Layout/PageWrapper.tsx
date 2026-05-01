import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "7xl" | "full";
  gradient?: "primary" | "secondary" | "muted" | "none";
  className?: string;
}

const maxWidthMap: Record<string, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  "7xl": "max-w-7xl",
  full: "w-full",
};

const gradientMap: Record<string, string> = {
  primary: "page-bg",
  secondary: "page-bg",
  muted: "page-bg",
  none: "",
};

export function PageWrapper({
  children,
  maxWidth = "7xl",
  gradient = "none",
  className,
}: PageWrapperProps) {
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-3.5rem)] py-8 px-4 md:px-8",
        gradientMap[gradient],
        className,
      )}
    >
      <div className={cn("mx-auto", maxWidthMap[maxWidth])}>{children}</div>
    </div>
  );
}
