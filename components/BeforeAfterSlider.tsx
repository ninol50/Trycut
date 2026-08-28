'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface BeforeAfterSliderProps {
  beforeSrc: string | null;
  afterSrc: string | null;
  label?: string;
  /** Ratio du cadre. 1080×1350 sur la landing, 9:16 sur un résultat exporté. */
  width?: number;
  height?: number;
}

/**
 * Comparateur avant/après. Poignée draggable violette, autoplay lent
 * 20% → 80% au premier passage dans le viewport, puis contrôle au doigt.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  label,
  width = 1080,
  height = 1350,
}: BeforeAfterSliderProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(20);
  const [userControlled, setUserControlled] = useState(false);
  const [autoplayDone, setAutoplayDone] = useState(false);

  const missing = !beforeSrc || !afterSrc;

  const updateFromClientX = useCallback((clientX: number) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  // Autoplay au premier passage dans le viewport.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || missing || autoplayDone) return;

    if (reduced) {
      setPosition(50);
      setAutoplayDone(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          setAutoplayDone(true);

          const start = performance.now();
          const duration = 1600;
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setPosition((current) => (userControlled ? current : 20 + eased * 60));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [missing, reduced, autoplayDone, userControlled]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setUserControlled(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateFromClientX(event.clientX);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      setUserControlled(true);
      setPosition((current) => Math.max(0, current - 5));
    } else if (event.key === 'ArrowRight') {
      setUserControlled(true);
      setPosition((current) => Math.min(100, current + 5));
    }
  };

  return (
    <figure className="m-0">
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Comparer avant et après"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-violet-50 shadow-violet"
        style={{ width: '100%', maxWidth: 320, aspectRatio: `${width} / ${height}` }}
      >
        {missing ? (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs text-violet-600">
            Paire avant/après à déposer dans /public/demo
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={afterSrc}
              alt="Après"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={beforeSrc}
                alt="Avant"
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>

            <div
              className="pointer-events-none absolute inset-y-0 w-[2px] bg-white/90"
              style={{ left: `${position}%` }}
            />
            <div
              className="pointer-events-none absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-violet-600 shadow-violet"
              style={{ left: `${position}%`, top: '50%' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 6-5 6 5 6M15 6l5 6-5 6" />
              </svg>
            </div>
          </>
        )}
      </div>
      {label ? (
        <figcaption className="mt-3 text-center text-sm text-slate-500">{label}</figcaption>
      ) : null}
    </figure>
  );
}
