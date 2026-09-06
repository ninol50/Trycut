'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ConsentNotice, { hasStoredConsent, storeConsent } from '@/components/generation/ConsentGate';
import CatalogPicker from '@/components/generation/CatalogPicker';
import ErrorState, { type ErrorKind } from '@/components/generation/ErrorState';
import { useTapScale } from '@/components/motion';
import { prepareUpload } from '@/lib/upload-client';
import { UPLOAD_MESSAGES } from '@/lib/upload';
import { rankCatalog } from '@/lib/catalog';
import { readAnswers, answerAsString } from '@/lib/onboarding';
import { track } from '@/lib/analytics';
import { PRICING } from '@/lib/pricing';
import type { PublicCatalogItem } from '@/types/db';

interface PhotoStudioProps {
  items: readonly PublicCatalogItem[];
  /** Route de suivi. L'id est ajouté en query string. */
  nextBasePath: string;
  lockedPremium: boolean;
  creditsRemaining: number | null;
  /** Sans compte, on laisse parcourir le catalogue mais pas envoyer de photo. */
  authenticated: boolean;
  /**
   * Abonnement actif. Sans lui, tout le studio reste utilisable — photo,
   * styles, aperçu — et c'est le bouton « générer » qui se verrouille. Le
   * rendu est la seule étape qui coûte de l'argent : c'est là que la porte
   * doit se trouver, pas avant.
   */
  paid: boolean;
}

/** État « vide » : import + consignes + catalogue filtré visible dessous. */
export default function PhotoStudio({
  items,
  nextBasePath,
  lockedPremium,
  creditsRemaining,
  authenticated,
  paid,
}: PhotoStudioProps) {
  const router = useRouter();
  const tap = useTapScale();
  const inputRef = useRef<HTMLInputElement>(null);

  const [consented, setConsented] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  // Un style par famille : demander deux coupes à la fois n'a pas de sens, et
  // le modèle rendrait un mélange des deux.
  const [selected, setSelected] = useState<readonly PublicCatalogItem[]>([]);

  const toggleStyle = useCallback((item: PublicCatalogItem) => {
    setSelected((current) => {
      const already = current.some((candidate) => candidate.id === item.id);
      const others = current.filter((candidate) => candidate.category !== item.category);
      return already ? others : [...others, item];
    });
  }, []);
  const [error, setError] = useState<{ kind: ErrorKind; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [offresVisibles, setOffresVisibles] = useState(false);
  const [answers, setAnswers] = useState(() => ({}) as ReturnType<typeof readAnswers>);

  useEffect(() => {
    setConsented(hasStoredConsent());
    setAnswers(readAnswers());
  }, []);

  // Le catalogue est réellement réordonné par les réponses d'onboarding.
  const ranked = useMemo(
    () => rankCatalog(items, answers).map((scored) => scored.item),
    [items, answers],
  );

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);

    const prepared = await prepareUpload(file);
    if (!prepared.ok) {
      setBusy(false);
      setError({ kind: 'file', message: UPLOAD_MESSAGES[prepared.code] });
      return;
    }

    setPreview(prepared.previewUrl);

    // Sans abonnement, la photo ne quitte pas le téléphone : l'aperçu suffit à
    // préparer son essai, et on ne stocke pas le visage de quelqu'un qui n'a
    // rien demandé de plus.
    if (!paid) {
      setBusy(false);
      return;
    }

    try {
      const form = new FormData();
      form.append('file', prepared.file);
      const response = await fetch('/api/uploads', { method: 'POST', body: form });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === 'object' && data !== null && 'message' in data
            ? String((data as { message: unknown }).message)
            : undefined;
        setError({ kind: response.status === 400 ? 'file' : 'network', message });
        return;
      }

      const path =
        typeof data === 'object' && data !== null && 'imagePath' in data
          ? String((data as { imagePath: unknown }).imagePath)
          : null;

      if (!path) {
        setError({ kind: 'network' });
        return;
      }

      setImagePath(path);
      track('photo_uploaded', { size: prepared.file.size });
    } catch {
      setError({ kind: 'network' });
    } finally {
      setBusy(false);
    }
  }, [paid]);

  const launch = useCallback(async () => {
    if (!imagePath || selected.length === 0 || !consented || busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imagePath,
          catalogItemIds: selected.map((item) => item.id),
          profile: {
            texture: answerAsString(answers, 'texture'),
            length: answerAsString(answers, 'length'),
            beard: answerAsString(answers, 'beard'),
            face: answerAsString(answers, 'face'),
            hairline: answerAsString(answers, 'hairline'),
          },
        }),
      });

      const data: unknown = await response.json().catch(() => null);
      const read = (key: string): string | undefined =>
        typeof data === 'object' && data !== null && key in data
          ? String((data as Record<string, unknown>)[key])
          : undefined;

      if (!response.ok) {
        const code = read('error');
        const known: readonly ErrorKind[] = [
          'quota', 'capacity', 'rate', 'rejected', 'payment', 'file',
        ];
        const kind: ErrorKind = known.includes(code as ErrorKind)
          ? (code as ErrorKind)
          : 'network';
        setError({ kind, message: read('message') });
        return;
      }

      const generationId = read('generationId');
      if (!generationId) {
        setError({ kind: 'network' });
        return;
      }

      router.push(`${nextBasePath}?id=${generationId}`);
    } catch {
      setError({ kind: 'network' });
    } finally {
      setBusy(false);
    }
  }, [imagePath, selected, consented, busy, answers, router, nextBasePath]);

  if (consented === null) return <div className="section py-16" aria-hidden="true" />;

  return (
    <div className="section py-8">
      <h1 className="text-2xl">Importe ton selfie.</h1>
      <p className="mt-2 text-base text-slate-500">
        Visage de face, bien éclairé, sans casquette.
      </p>

      {creditsRemaining !== null && creditsRemaining > 0 ? (
        <p className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-600">
          {creditsRemaining} coupe{creditsRemaining > 1 ? 's' : ''} restante
          {creditsRemaining > 1 ? 's' : ''}
        </p>
      ) : null}

      {/* Le compte existe mais n'a aucune coupe : on le dit ici plutôt que de
          le laisser choisir un style puis buter sur un refus. */}
      {authenticated && creditsRemaining === 0 ? (
        <div className="mt-5 rounded-3xl border border-line p-6">
          <p className="font-display text-lg font-bold text-violet-900">
            Il te faut un abonnement pour générer.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ton compte est actif. L’offre Essentiel donne 15 coupes par mois pour
            7,99 €, l’offre Complet 25 coupes pour 9,99 €. Sans engagement.
          </p>
          <Link href="/tarifs" className="btn-primary mt-5 w-full">
            Voir les offres
          </Link>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />

      <motion.button
        type="button"
        whileTap={tap}
        onClick={() => inputRef.current?.click()}
        className="mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 p-8"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Aperçu de ta photo"
            className="h-40 w-40 rounded-2xl object-cover"
          />
        ) : (
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--violet-600)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
        <span className="text-base font-semibold text-violet-600">
          {preview ? 'Changer de photo' : 'Choisir une photo'}
        </span>
      </motion.button>

      {paid ? (
      <div className="mt-4">
        <ConsentNotice
          checked={consented}
          onChange={(value) => {
            setConsented(value);
            storeConsent(value);
          }}
        />
      </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorState
            kind={error.kind}
            message={error.message}
            onRetry={error.kind === 'quota' ? undefined : () => setError(null)}
          />
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-xl">Choisis un style</h2>
        <p className="mt-1 text-sm text-slate-500">
          Coupes, barbes, couleurs et accessoires. Tu peux en combiner plusieurs —
          une coupe et une barbe, par exemple. Un choix par famille.
        </p>
        <div className="mt-5">
          <CatalogPicker
            items={ranked}
            selectedIds={selected.map((item) => item.id)}
            onToggle={toggleStyle}
            lockedPremium={lockedPremium}
          />
        </div>
      </div>

      {/* Le rendu est la seule étape qui coûte de l'argent : c'est la seule
          qui se verrouille. Tout ce qui précède reste ouvert. */}
      <div className="sticky bottom-4 mt-8">
        {paid ? (
          <motion.button
            type="button"
            whileTap={tap}
            disabled={!imagePath || selected.length === 0 || !consented || busy}
            onClick={() => void launch()}
            className="btn-primary w-full disabled:opacity-50"
          >
            {busy ? 'Un instant…' : 'Générer ma coupe'}
          </motion.button>
        ) : (
          <>
            {offresVisibles ? (
              <div className="mb-3 rounded-3xl border border-line bg-white p-5">
                <p className="font-display text-lg font-bold text-violet-900">
                  Choisis ton offre pour lancer le rendu.
                </p>
                <ul className="mt-4 space-y-2">
                  {PRICING.filter((offre) => offre.id !== 'free').map((offre) => (
                    <li
                      key={offre.id}
                      className="flex items-baseline justify-between border-b border-line pb-2 last:border-b-0 last:pb-0"
                    >
                      <span className="text-base font-semibold text-violet-900">
                        {offre.name}
                      </span>
                      <span className="text-sm text-slate-500">
                        {offre.price}
                        {offre.period} · {offre.credits} coupes
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/tarifs" className="btn-primary mt-5 w-full">
                  {authenticated ? 'Choisir mon offre' : 'Créer mon compte et m’abonner'}
                </Link>
              </div>
            ) : null}

            <motion.button
              type="button"
              whileTap={tap}
              aria-expanded={offresVisibles}
              onClick={() => {
                setOffresVisibles((valeur) => !valeur);
                track('paywall_hit', { location: 'studio' });
              }}
              className="btn-primary w-full"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="10" width="16" height="10" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Générer ma coupe
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
