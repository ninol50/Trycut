'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoUploader } from '@/components/generation/PhotoUploader';
import type { UploadedPhoto } from '@/components/generation/PhotoUploader';
import { ConsentGate, CONSENT_STORAGE_KEY } from '@/components/generation/ConsentGate';
import { CatalogGrid } from '@/components/catalog/CatalogGrid';
import { Button } from '@/components/ui/Button';
import { filterCatalog } from '@/lib/catalog';
import type { CatalogItemView } from '@/lib/catalog';
import { ONBOARDING_STORAGE_KEY, parseAnswers } from '@/lib/onboarding';
import type { OnboardingAnswers } from '@/lib/onboarding';
import { PENDING_GENERATION_KEY } from '@/lib/pending';

interface PhotoStepProps {
  catalog: CatalogItemView[];
  /** Vrai pour un compte au pass mensuel. */
  premiumUnlocked?: boolean;
  /** Où poursuivre après le lancement. */
  nextHref: string;
  /** Contenu inséré sous le catalogue, au-dessus de la barre d'action fixe. */
  children?: React.ReactNode;
}

/**
 * L'état « vide » du pipeline (section 7.2) : zone d'import, consignes courtes,
 * et catalogue filtré visible juste en dessous.
 */
export function PhotoStep({
  catalog,
  premiumUnlocked = false,
  nextHref,
  children,
}: PhotoStepProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [selected, setSelected] = useState<CatalogItemView | null>(null);
  const [consent, setConsent] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAnswers(parseAnswers(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)));
    setConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'accepted');
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent ? 'accepted' : 'refused');
  }, [consent, hydrated]);

  // Le filtrage découle directement des écrans 2, 3, 5, 7 et 9.
  const items = useMemo(
    () => filterCatalog(catalog, answers, { includePremium: true }),
    [catalog, answers],
  );

  const ready = photo !== null && selected !== null && consent;

  function launch(): void {
    if (!ready || !photo || !selected) return;
    window.sessionStorage.setItem(
      PENDING_GENERATION_KEY,
      JSON.stringify({
        storagePath: photo.storagePath,
        catalogItemId: selected.id,
        catalogLabel: selected.label,
        previewUrl: photo.previewUrl,
      }),
    );
    router.push(nextHref);
  }

  const firstName = answers.firstName?.trim();

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-32 pt-6">
      <h1 className="text-display-lg">
        {firstName ? `${firstName}, importe ta photo` : 'Importe ta photo'}
      </h1>
      <p className="mt-2 text-body text-slate-500">
        Visage de face, bien éclairé, sans casquette.
      </p>

      <div className="mt-6">
        <PhotoUploader photo={photo} onUploaded={setPhoto} disabled={!consent} />
      </div>

      {!consent && (
        <p className="mt-3 text-body-sm text-slate-500">
          Coche la case ci-dessous pour pouvoir importer ta photo.
        </p>
      )}

      <div className="mt-4">
        <ConsentGate accepted={consent} onChange={setConsent} />
      </div>

      <section className="mt-10">
        <h2 className="text-display-md">Choisis un style</h2>
        <p className="mb-4 mt-1 text-body-sm text-slate-500">
          {items.length} propositions retenues d’après tes réponses.
        </p>
        <CatalogGrid
          items={items}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          goal={answers.goal}
          premiumUnlocked={premiumUnlocked}
        />
      </section>

      {children}

      {/* Barre d'action fixe : une seule action possible à l'écran. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-violet-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <Button fullWidth disabled={!ready} onClick={launch}>
            {selected ? `Générer : ${selected.label}` : 'Choisis un style'}
          </Button>
        </div>
      </div>
    </div>
  );
}
