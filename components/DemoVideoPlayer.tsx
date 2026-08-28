'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { track } from '@/lib/analytics';

interface DemoVideoPlayerProps {
  mp4: string | null;
  webm: string | null;
  poster: string | null;
}

const WIDTH = 320;
const HEIGHT = 569; // 9:16

export default function DemoVideoPlayer({ mp4, webm, poster }: DemoVideoPlayerProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || seen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            track('demo_video_viewed');
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);

  return (
    <div
      ref={containerRef}
      className="mx-auto overflow-hidden rounded-2xl shadow-violet-lg"
      style={{ width: '100%', maxWidth: WIDTH, aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    >
      {reduced && poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          width={WIDTH}
          height={HEIGHT}
          className="h-full w-full object-cover"
        />
      ) : (
        <video
          aria-hidden="true"
          autoPlay={!reduced}
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster ?? undefined}
          width={WIDTH}
          height={HEIGHT}
          className="h-full w-full object-cover"
        >
          {webm ? <source src={webm} type="video/webm" /> : null}
          {mp4 ? <source src={mp4} type="video/mp4" /> : null}
        </video>
      )}
    </div>
  );
}
