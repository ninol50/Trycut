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
import { offreEntree } from '@/lib/pricing';
import {
  clearDraft,
  dataUrlToFile,
  fileToDataUrl,
  readDraft,
  saveDraft,
} from '@/lib/studio-draft';
import { track } from '@/lib/analytics';
import type { PublicCatalogItem } from '@/types/db';

interface PhotoStudioProps {
  items: readonly PublicCatalogItem[];
  /** Route de suivi. L'id est ajouté en query string. */
  nextBasePath: string;
  /** Route des offres. Une chaîne, jamais une fonction qui traverserait la frontière. */
  pricingPath?: string;
  lockedPremium: boolean;
  creditsRemaining: number | null;
  /** Sans compte, on laisse parcourir le catalogue mais pas envoyer de photo. */
  authenticated: boolean;
  /**
   * Compte sans abonnement actif. Le studio s'utilise entièrement — photo,
   * styles — mais rien ne part au serveur : le bouton mène aux offres.
   */
  paywalled: boolean;
}

/** État « vide » : import + consignes + catalogue filtré visible dessous. */
export default function PhotoStudio({
  items,
  nextBasePath,
  pricingPath = '/tarifs',
  lockedPremium,
  creditsRemaining,
  authenticated,
  paywalled,
}: PhotoStudioProps) {
  const router = useRouter();
  const tap = useTapScale();
  const inputRef = useRef<HTMLInputElement>(null);

  const [consented, setConsented] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  /** Photo mémorisée, pour la retrouver au retour du paiement. */
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  // Un style par famille : demander deux coupes à la fois n'a pas de sens, et
  // le modèle rendrait un mélange des deux.
  const [selected, setSelected] = useState<readonly PublicCatalogItem[]>([]);
  const [restored, setRestored] = useState(false);

  const toggleStyle = useCallback((item: PublicCatalogItem) => {
    setSelected((current) => {
      const already = current.some((candidate) => candidate.id === item.id);
      const others = current.filter((candidate) => candidate.category !== item.category);
      return already ? others : [...others, item];
    });
  }, []);
  const [error, setError] = useState<{ kind: ErrorKind; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState(() => ({}) as ReturnType<typeof readAnswers>);

  const entree = offreEntree();

  /** Dépôt effectif de la photo. Réservé aux comptes qui ont un abonnement. */
  const sendToServer = useCallback(async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
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
      track('photo_uploaded', { size: file.size });
    } catch {
      setError({ kind: 'network' });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    setConsented(hasStoredConsent());
    setAnswers(readAnswers());
  }, []);

  // Reprise du brouillon : la personne qui revient de la page de paiement
  // retrouve sa photo et sa coupe, et n'a plus qu'à appuyer sur générer.
  useEffect(() => {
    const draft = readDraft();

    if (draft) {
      if (draft.styleIds.length > 0) {
        const retrouves = draft.styleIds
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is PublicCatalogItem => item !== undefined);
        if (retrouves.length > 0) setSelected(retrouves);
      }

      if (draft.photo) {
        setPhotoData(draft.photo);
        setPreview(draft.photo);
        // L'abonnement vient d'être pris : la photo peut enfin partir.
        const file = paywalled ? null : dataUrlToFile(draft.photo);
        if (file) void sendToServer(file);
      }
    }

    setRestored(true);
  }, [items, paywalled, sendToServer]);

  // Mémorisation continue : un aller-retour par les offres ne doit rien effacer.
  useEffect(() => {
    if (!restored) return;
    if (!photoData && selected.length === 0) return;
    saveDraft({ photo: photoData, styleIds: selected.map((item) => item.id) });
  }, [restored, photoData, selected]);

  // Le catalogue est réellement réordonné par les réponses d'onboarding.
  const ranked = useMemo(
    () => rankCatalog(items, answers).map((scored) => scored.item),
    [items, answers],
  );

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);

      const prepared = await prepareUpload(file);
      if (!prepared.ok) {
        setBusy(false);
        setError({ kind: 'file', message: UPLOAD_MESSAGES[prepared.code] });
        return;
      }

      setPreview(prepared.previewUrl);
      setImagePath(null);
      void fileToDataUrl(prepared.file).then(setPhotoData);

      // Sans abonnement, la photo ne quitte pas le téléphone : elle sert
      // d'aperçu, rien de plus. Rien à stocker, rien à payer, et la porte du
      // dépôt reste fermée côté serveur.
      if (paywalled) {
        setBusy(false);
        track('photo_selected', { size: prepared.file.size });
        return;
      }

      await sendToServer(prepared.file);
    },
    [paywalled, sendToServer],
  );

  const launch = useCallback(async () => {
    if (selected.length === 0 || !consented || busy) return;

    // C'est ici que l'abonnement se demande : la photo est choisie, la coupe
    // aussi, la personne sait exactement ce qu'elle achète.
    if (paywalled) {
      if (!preview) return;
      track('paywall_hit', { location: 'studio' });
      router.push(`${pricingPath}?raison=generation`);
      return;
    }

    if (!imagePath) return;
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

      // Le rendu est lancé : le brouillon n'a plus lieu d'être.
      clearDraft();
      router.push(`${nextBasePath}?id=${generationId}`);
    } catch {
      setError({ kind: 'network' });
    } finally {
      setBusy(false);
    }
  }, [
    imagePath,
    preview,
    selected,
    consented,
    busy,
    answers,
    router,
    nextBasePath,
    paywalled,
    pricingPath,
  ]);

  if (consented === null) return <div className="section py-16" aria-hidden="true" />;

  // Sans abonnement, l'aperçu local suffit à débloquer le bouton : c'est lui
  // qui mène aux offres, pas au modèle.
  const photoPrete = paywalled ? preview !== null : imagePath !== null;

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

      {/* Le compte existe mais n'a pas d'abonnement. On ne ferme pas la porte :
          on laisse préparer la coupe, et on annonce où se prend l'abonnement.
          Une ligne, pas un mur — le mur, c'est ce qui faisait partir. */}
      {authenticated && paywalled ? (
        <p className="mt-3 rounded-2xl border border-line p-4 text-sm text-slate-500">
          Choisis ta photo et ta coupe. L’abonnement se prend à l’étape suivante
          {entree ? `, à partir de ${entree.price} par mois` : ''}.
        </p>
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

      {!authenticated ? (
        <div className="mt-5 rounded-3xl border border-line p-6 text-center">
          <p className="font-display text-lg font-bold text-violet-900">
            Crée ton compte pour envoyer ta photo.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ta photo n’est visible que par toi. Le catalogue ci-dessous reste consultable
            librement.
          </p>
          <Link href="/inscription" className="btn-primary mt-5 w-full">
            Créer mon compte
          </Link>
          <Link
            href="/connexion"
            className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center text-sm font-semibold text-violet-600 underline"
          >
            J’ai déjà un compte
          </Link>
        </div>
      ) : (
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
      )}

      {authenticated ? (
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

      {authenticated ? (
      <div className="sticky bottom-4 mt-8">
        <motion.button
          type="button"
          whileTap={tap}
          disabled={!photoPrete || selected.length === 0 || !consented || busy}
          onClick={() => void launch()}
          className="btn-primary w-full disabled:opacity-50"
        >
          {busy ? 'Un instant…' : 'Générer ma coupe'}
        </motion.button>
      </div>
      ) : null}
    </div>
  );
}
