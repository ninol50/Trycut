'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { Button, LinkButton } from '@/components/ui/Button';
import { buildExport, download, shareOrDownload } from '@/lib/export';
import { readResult } from '@/lib/result';
import type { StoredResult } from '@/lib/result';
import { capture } from '@/lib/analytics';

interface ResultViewProps {
  photoHref: string;
  /** Bloc affiché sous le résultat : incitation à créer un compte, ou non. */
  signupPrompt: boolean;
  firstNameFallback?: string;
}

/** État « rempli » du pipeline : comparateur, téléchargement, partage. */
export function ResultView({ photoHref, signupPrompt, firstNameFallback }: ResultViewProps) {
  const router = useRouter();
  const [result, setResult] = useState<StoredResult | null>(null);
  const [busy, setBusy] = useState<'share' | 'download' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = readResult();
    if (!stored) {
      router.replace(photoHref);
      return;
    }
    setResult(stored);
  }, [router, photoHref]);

  if (!result) return null;

  const filename = `trycut-${result.generationId.slice(0, 8)}.jpg`;

  async function run(action: 'share' | 'download'): Promise<void> {
    if (!result) return;
    setBusy(action);
    setNotice(null);

    const blob = await buildExport(result.resultUrl, {
      watermarked: result.watermarked,
      label: result.label,
    });

    if (!blob) {
      setNotice('L’export a échoué. Réessaie.');
      setBusy(null);
      return;
    }

    if (action === 'download') {
      if (!download(blob, filename)) setNotice('Le téléchargement a échoué. Réessaie.');
    } else {
      capture('share_clicked', { generation_id: result.generationId });
      const outcome = await shareOrDownload(blob, filename);
      if (outcome === 'downloaded') setNotice('Image enregistrée dans tes téléchargements.');
      if (outcome === 'failed') setNotice('Le partage a été annulé.');
    }

    setBusy(null);
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-12 pt-6">
      <h1 className="text-display-lg">
        {firstNameFallback ? `${firstNameFallback}, voilà le résultat` : 'Voilà le résultat'}
      </h1>
      {result.label && (
        <p className="mt-2 text-body text-slate-500">{result.label}</p>
      )}

      <div className="mt-6">
        <BeforeAfterSlider
          beforeSrc={result.beforeUrl || '/demo/before-1.jpg'}
          afterSrc={result.resultUrl}
          beforeAlt="Ta photo d’origine"
          afterAlt="Ton nouveau look"
          width={1080}
          height={1350}
        />
      </div>

      {result.watermarked && (
        <p className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-body-sm text-violet-900">
          Version d’essai : définition réduite et filigrane. Les offres payantes
          te donnent le HD sans filigrane.
        </p>
      )}

      <div className="mt-6 space-y-3">
        <Button fullWidth onClick={() => void run('share')} disabled={busy !== null}>
          {busy === 'share' ? 'Préparation…' : 'Partager'}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => void run('download')}
          disabled={busy !== null}
        >
          {busy === 'download' ? 'Préparation…' : 'Télécharger en 9:16'}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push(photoHref)}>
          Essayer une autre coupe
        </Button>
      </div>

      {notice && (
        <p role="status" className="mt-4 text-center text-body-sm text-slate-500">
          {notice}
        </p>
      )}

      {signupPrompt && (
        <div className="mt-10 rounded-2xl border-2 border-violet-600 bg-violet-50 p-5">
          <h2 className="text-display-md">Garde ce résultat</h2>
          <p className="mt-2 text-body text-slate-500">
            Crée un compte pour retrouver tes essais, en lancer d’autres et
            récupérer le HD sans filigrane.
          </p>
          <LinkButton href="/inscription" fullWidth className="mt-5">
            Créer mon compte
          </LinkButton>
        </div>
      )}
    </div>
  );
}
