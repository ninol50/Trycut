'use client';

import Image from 'next/image';
import { useState } from 'react';

interface DemoImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Pictogramme affiché tant que le fichier n'existe pas. */
  glyph?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Image de démonstration tolérante à l'absence de fichier.
 *
 * `/public/demo/` n'est pas versionné avec des visuels (voir son README) : le
 * placeholder violet est rendu en dessous, l'image se superpose dès qu'elle
 * charge. Aucun `<img>` cassé, et aucun décalage de mise en page puisque les
 * dimensions sont explicites des deux côtés.
 */
export function DemoImage({
  src,
  alt,
  width,
  height,
  className,
  glyph = '◐',
  priority = false,
  sizes,
}: DemoImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div className="media-placeholder absolute inset-0" aria-hidden="true">
        <span className="text-[2rem] leading-none opacity-70">{glyph}</span>
      </div>
      {!failed && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={sizes}
          unoptimized
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
