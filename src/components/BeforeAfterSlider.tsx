'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { DemoImage } from '@/components/ui/DemoImage';
import { useReducedMotion } from '@/lib/motion';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  width?: number;
  height?: number;
  className?: string;
  /** Balayage automatique au premier passage dans le viewport. */
  autoplay?: boolean;
}

const AUTOPLAY_FROM = 20;
const AUTOPLAY_TO = 80;
const AUTOPLAY_DURATION_MS = 2400;

/**
 * Le composant signature de la page d'accueil.
 *
 * Comportement : au premier passage dans le viewport, la poignée balaie
 * lentement de 20 % à 80 % puis s'arrête. Ensuite, elle est entièrement
 * contrôlable au doigt, à la souris et au clavier (flèches). Sous
 * `prefers-reduced-motion`, aucun balayage : la poignée se place directement
 * au milieu et attend l'utilisateur.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = 'Avant',
  afterAlt = 'Après',
  width = 1080,
  height = 1350,
  className,
  autoplay = true,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(containerRef, { once: true, amount: 0.5 });

  // Toujours la même valeur initiale que le rendu serveur : `useReducedMotion`
  // renvoie null côté serveur, s'en servir ici ferait diverger le style inline
  // et casserait l'hydratation. Le cas « mouvement réduit » est appliqué dans
  // l'effet ci-dessous, une fois monté.
  const [position, setPosition] = useState(AUTOPLAY_FROM);
  const [dragging, setDragging] = useState(false);
  const autoplayDone = useRef(false);
  const frame = useRef<number | null>(null);

  const stopAutoplay = useCallback(() => {
    autoplayDone.current = true;
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  // Balayage d'autoplay — une seule fois, interrompu dès que l'utilisateur
  // touche la poignée.
  useEffect(() => {
    if (reduced) {
      // Sans balayage, la poignée se place au milieu et attend l'utilisateur.
      autoplayDone.current = true;
      setPosition(50);
      return;
    }
    if (!autoplay || !inView || autoplayDone.current) return;

    const start = performance.now();
    const tick = (now: number): void => {
      const raw = Math.min((now - start) / AUTOPLAY_DURATION_MS, 1);
      // easeOutCubic : départ franc, arrivée posée.
      const eased = 1 - Math.pow(1 - raw, 3);
      setPosition(AUTOPLAY_FROM + (AUTOPLAY_TO - AUTOPLAY_FROM) * eased);
      if (raw < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        stopAutoplay();
      }
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [autoplay, reduced, inView, stopAutoplay]);

  const updateFromClientX = useCallback((clientX: number) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    stopAutoplay();
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging) return;
    updateFromClientX(event.clientX);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging) return;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    stopAutoplay();
    const step = event.shiftKey ? 10 : 4;
    setPosition((current) =>
      Math.min(100, Math.max(0, current + (event.key === 'ArrowRight' ? step : -step))),
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative touch-none select-none overflow-hidden rounded-2xl shadow-violet ${className ?? ''}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Après : image de fond, visible à droite de la poignée. */}
      <DemoImage
        src={afterSrc}
        alt={afterAlt}
        width={width}
        height={height}
        glyph="✦"
        priority
        className="absolute inset-0 h-full w-full"
        sizes="(max-width: 640px) 100vw, 480px"
      />

      {/* Avant : superposé et rogné à la position de la poignée. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <DemoImage
          src={beforeSrc}
          alt={beforeAlt}
          width={width}
          height={height}
          glyph="○"
          priority
          className="absolute inset-0 h-full w-full"
          sizes="(max-width: 640px) 100vw, 480px"
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-body-sm font-semibold text-violet-900">
        avant
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-violet-600 px-3 py-1 text-body-sm font-semibold text-white">
        après
      </span>

      {/* Poignée violette. */}
      <div
        className="absolute inset-y-0 w-[3px] bg-violet-600"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        aria-hidden="true"
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparer avant et après"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)} % de la photo avant`}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize
                   items-center justify-center rounded-full border-2 border-violet-600 bg-white shadow-violet"
        style={{ left: `${position}%` }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M6.5 4 3 9l3.5 5M11.5 4 15 9l-3.5 5"
            stroke="#7C3AED"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
