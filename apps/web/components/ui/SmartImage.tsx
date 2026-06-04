"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** URL affichée si l'image principale échoue (ex. dos de carte). */
  fallbackSrc?: string;
  /** Classe appliquée au conteneur (positionné). */
  wrapperClassName?: string;
  /** Désactive le skeleton de chargement (ex. petites icônes). */
  noSkeleton?: boolean;
}

/**
 * Image légère et fluide, sans passer par l'optimiseur Next (pour ne pas
 * surcharger le serveur self-hosted sur des milliers de cartes) :
 *  - `loading="lazy"` + `decoding="async"` (hors du chemin critique) ;
 *  - skeleton animé tant que l'image n'est pas chargée ;
 *  - fondu d'apparition une fois chargée (réduit le « pop » qui donne le
 *    sentiment de lag) ;
 *  - repli automatique sur `fallbackSrc` en cas d'erreur.
 *
 * Le conteneur doit définir les dimensions (ex. `aspect-[3/4] relative`).
 */
export function SmartImage({
  src,
  fallbackSrc,
  alt = "",
  className,
  wrapperClassName,
  noSkeleton = false,
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const effectiveSrc = errored && fallbackSrc ? fallbackSrc : src;

  return (
    <span className={cn("absolute inset-0 block", wrapperClassName)}>
      {!loaded && !noSkeleton && (
        <span className="absolute inset-0 animate-pulse rounded-[inherit] bg-muted" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={effectiveSrc}
        alt={alt}
        loading="lazy"
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
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </span>
  );
}

export default SmartImage;
