'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import { useTapScale } from '@/components/motion';
import { buildExportBlob, shareOrDownload } from '@/lib/export-image';
import { track } from '@/lib/analytics';

interface ResultViewProps {
  sourceUrl: string | null;
  resultUrl: string | null;
  watermarked: boolean;
  onRetry: () => void;
  /** Affiché sous le résultat de l'essai anonyme. */
  signupPrompt?: boolean;
}

/** État « rempli » : comparateur, télécharger, partager, essayer autre chose. */
export default function ResultView({
  sourceUrl,
  resultUrl,
  watermarked,
  onRetry,
  signupPrompt = false,
}: ResultViewProps) {
  const tap = useTapScale();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const exportImage = async (intent: 'share' | 'download') => {
    if (!resultUrl || busy) return;
    setBusy(true);
    setNotice(null);

    try {
      const blob = await buildExportBlob(resultUrl, watermarked);

      if (!blob) {
        // Repli : ouverture directe de l'URL signée.
        window.open(resultUrl, '_blank', 'noopener');
        setNotice('Ouvre l’image puis enregistre-la depuis ton navigateur.');
        return;
      }

      const outcome = await shareOrDownload(blob, 'trycut-9x16.jpg');
      if (intent === 'share') track('share_clicked', { outcome });
      setNotice(outcome === 'shared' ? 'Partagé.' : 'Image enregistrée en 9:16.');
    } catch {
      setNotice('L’export a échoué. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section py-8">
      <h1 className="text-2xl">Voilà ce que ça donne.</h1>

      <div className="mt-6">
        <BeforeAfterSlider
          beforeSrc={sourceUrl}
          afterSrc={resultUrl}
          width={1080}
          height={1350}
          label="Glisse pour comparer"
        />
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">Image générée par IA</p>

      {watermarked ? (
        <p className="mt-2 text-center text-xs text-slate-500">
          Basse résolution et filigrane sur l’essai gratuit.
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        <motion.button
          type="button"
          whileTap={tap}
          disabled={busy || !resultUrl}
          onClick={() => void exportImage('download')}
          className="btn-primary w-full disabled:opacity-60"
        >
          Télécharger en 9:16
        </motion.button>

        <motion.button
          type="button"
          whileTap={tap}
          disabled={busy || !resultUrl}
          onClick={() => void exportImage('share')}
          className="btn-secondary w-full disabled:opacity-60"
        >
          Partager
        </motion.button>

        <motion.button
          type="button"
          whileTap={tap}
          onClick={onRetry}
          className="min-h-[48px] w-full py-3 text-center text-sm font-semibold text-violet-600 underline"
        >
          Essayer une autre coupe
        </motion.button>
      </div>

      {notice ? (
        <p role="status" className="mt-4 text-center text-sm text-slate-500">
          {notice}
        </p>
      ) : null}

      {signupPrompt ? (
        <div className="mt-8 rounded-2xl bg-violet-600 p-5 text-center">
          <p className="font-display text-lg font-bold text-white">
            Garde ce résultat, sans filigrane.
          </p>
          <p className="mt-2 text-sm text-white/80">
            Un compte débloque un crédit offert et sauvegarde tes essais.
          </p>
          <Link
            href="/inscription"
            className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-violet-600"
          >
            Créer mon compte
          </Link>
        </div>
      ) : null}
    </div>
  );
}
