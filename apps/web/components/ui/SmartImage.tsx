"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** URL shown if the primary image fails, for example a card back. */
  fallbackSrc?: string;
  /** Class applied to the positioned container. */
  wrapperClassName?: string;
  /** Disables the loading skeleton, for example for small icons. */
  noSkeleton?: boolean;
  /** Compatibility prop with next/image (SmartImage fills its parent by default). */
  fill?: boolean;
}

/**
 * Lightweight image component that bypasses Next optimization to avoid overloading a self-hosted server with thousands of cards. It lazy-loads, shows a loading skeleton, fades in, and falls back to `fallbackSrc`. The container must define its dimensions, for example `aspect-[3/4] relative`.
 */
export function SmartImage({
  src,
  fallbackSrc,
  alt = "",
  className,
  wrapperClassName,
  noSkeleton = false,
  fill: _fill,
  loading = "lazy",
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const effectiveSrc = errored && fallbackSrc ? fallbackSrc : src;

  return (
    <span className={cn("absolute inset-0 block", wrapperClassName)}>
      {!loaded && !noSkeleton && (
        <span className="absolute inset-0 animate-pulse rounded-[inherit] bg-muted" />
      )}

      <img
        ref={(el) => {
          if (el && el.complete && el.naturalWidth > 0 && !loaded) {
            setLoaded(true);
          }
        }}
        src={effectiveSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!errored && fallbackSrc) {
            setErrored(true);
          } else {
            setLoaded(true);
          }
        }}
        className={cn(
          "h-full w-full block",
          !noSkeleton && "transition-opacity duration-300",
          noSkeleton || loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </span>
  );
}

export default SmartImage;
