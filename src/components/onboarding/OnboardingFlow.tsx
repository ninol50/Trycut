'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ChoiceGrid } from '@/components/onboarding/ChoiceGrid';
import { AnimatedCounter, SkeletonPreview } from '@/components/onboarding/TransitionScreens';
import { Button } from '@/components/ui/Button';
import { cascadeVariants, stepVariants, useReducedMotion } from '@/lib/motion';
import { capture } from '@/lib/analytics';
import {
  ONBOARDING_SCREENS,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TOTAL_STEPS,
  labelForAnswer,
  parseAnswers,
} from '@/lib/onboarding';
import type { AnswerKey, OnboardingAnswers, OnboardingScreen } from '@/lib/onboarding';
import { countSelectedCuts } from '@/lib/catalog';
import type { CatalogItemView } from '@/lib/catalog';

/** Délai d'avancement automatique après un choix unique. */
const AUTO_ADVANCE_MS = 250;

/** Résumé affiché à l'écran 13, dans l'ordre du questionnaire. */
const SUMMARY_KEYS: readonly { key: AnswerKey; label: string }[] = [
  { key: 'goal', label: 'Objectif' },
  { key: 'length', label: 'Longueur' },
  { key: 'texture', label: 'Texture' },
  { key: 'hairline', label: 'Ligne de cheveux' },
  { key: 'faceShape', label: 'Forme du visage' },
  { key: 'style', label: 'Style' },
  { key: 'beard', label: 'Barbe' },
  { key: 'accessories', label: 'Accessoires' },
  { key: 'boldness', label: 'Audace' },
];

export function OnboardingFlow({ catalog }: { catalog: CatalogItemView[] }) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [hydrated, setHydrated] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aucun compte demandé : tout vit dans localStorage sous `onboarding_v1`.
  useEffect(() => {
    setAnswers(parseAnswers(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(answers));
  }, [answers, hydrated]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const screen = ONBOARDING_SCREENS[index];

  // Le compte affiché à l'écran 13 découle réellement des réponses : c'est ce
  // qui rend le questionnaire légitime plutôt que subi.
  const cutCount = useMemo(() => countSelectedCuts(catalog, answers), [catalog, answers]);

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((current) => Math.min(current + 1, ONBOARDING_SCREENS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

  /** Un choix unique : on enregistre, on instrumente, on avance à +250 ms. */
  const selectSingle = useCallback(
    (key: AnswerKey, value: string, step: number) => {
      setAnswers((current) => ({ ...current, [key]: value }));
      capture('onboarding_step_completed', { step, answer: value });
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(goNext, AUTO_ADVANCE_MS);
    },
    [goNext],
  );

  const toggleMulti = useCallback(
    (value: string, exclusiveValue: string | undefined) => {
      setAnswers((current) => {
        const previous = current.accessories ?? [];
        if (value === exclusiveValue) {
          return { ...current, accessories: previous.includes(value) ? [] : [value] };
        }
        const withoutExclusive = previous.filter((v) => v !== exclusiveValue);
        const next = withoutExclusive.includes(value)
          ? withoutExclusive.filter((v) => v !== value)
          : [...withoutExclusive, value];
        return { ...current, accessories: next };
      });
    },
    [],
  );

  const finish = useCallback(() => {
    capture('onboarding_finished', {
      cuts_selected: cutCount,
      accessories: answers.accessories ?? [],
    });
    router.push('/onboarding/photo');
  }, [answers.accessories, cutCount, router]);

  const summaryRows = useMemo(
    () =>
      SUMMARY_KEYS.map(({ key, label }) => {
        const raw = answers[key];
        if (Array.isArray(raw)) {
          if (raw.length === 0) return null;
          return { label, value: raw.map((v) => labelForAnswer(key, v)).join(', ') };
        }
        if (!raw) return null;
        return { label, value: labelForAnswer(key, raw) };
      }).filter((row): row is { label: string; value: string } => row !== null),
    [answers],
  );

  if (!screen) return null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-6">
      <header className="mb-8">
        <div className="mb-4 flex min-h-tap items-center">
          {index > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="-ml-2 flex min-h-tap min-w-tap items-center gap-2 px-2 text-body-sm font-semibold text-violet-600"
            >
              <span aria-hidden="true">←</span> Retour
            </button>
          ) : (
            <span className="text-body-sm text-slate-500">Trycut</span>
          )}
        </div>
        <ProgressBar step={screen.step} total={ONBOARDING_TOTAL_STEPS} />
      </header>

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={screen.step}
          custom={direction}
          variants={stepVariants(reduced)}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex flex-1 flex-col"
        >
          <ScreenBody
            screen={screen}
            answers={answers}
            firstName={answers.firstName ?? ''}
            cutCount={cutCount}
            summaryRows={summaryRows}
            reduced={reduced}
            onSelectSingle={selectSingle}
            onToggleMulti={toggleMulti}
            onChangeText={(value) => setAnswers((current) => ({ ...current, firstName: value }))}
            onContinue={goNext}
            onFinish={finish}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface ScreenBodyProps {
  screen: OnboardingScreen;
  answers: OnboardingAnswers;
  firstName: string;
  cutCount: number;
  summaryRows: { label: string; value: string }[];
  reduced: boolean;
  onSelectSingle: (key: AnswerKey, value: string, step: number) => void;
  onToggleMulti: (value: string, exclusiveValue: string | undefined) => void;
  onChangeText: (value: string) => void;
  onContinue: () => void;
  onFinish: () => void;
}

function ScreenBody({
  screen,
  answers,
  firstName,
  cutCount,
  summaryRows,
  reduced,
  onSelectSingle,
  onToggleMulti,
  onChangeText,
  onContinue,
  onFinish,
}: ScreenBodyProps) {
  switch (screen.kind) {
    case 'choice':
      return (
        <>
          <Heading title={screen.title} subtitle={screen.subtitle} />
          <ChoiceGrid
            choices={screen.choices}
            selected={answers[screen.key]}
            illustrated={screen.illustrated ?? false}
            onSelect={(value) => onSelectSingle(screen.key, value, screen.step)}
          />
        </>
      );

    case 'multi': {
      const selected = answers.accessories ?? [];
      return (
        <>
          <Heading title={screen.title} subtitle={screen.subtitle} />
          <ChoiceGrid
            choices={screen.choices}
            selected={selected}
            multi
            onSelect={(value) => onToggleMulti(value, screen.exclusiveValue)}
          />
          <div className="mt-auto pt-8">
            <Button
              fullWidth
              disabled={selected.length === 0}
              onClick={() => {
                capture('onboarding_step_completed', {
                  step: screen.step,
                  answer: selected.join(','),
                });
                onContinue();
              }}
            >
              Continuer
            </Button>
          </div>
        </>
      );
    }

    case 'text':
      return (
        <>
          <Heading title={screen.title} subtitle={screen.subtitle} />
          <label htmlFor="first-name" className="sr-only">
            {screen.title}
          </label>
          <input
            id="first-name"
            type="text"
            autoComplete="given-name"
            maxLength={screen.maxLength}
            value={firstName}
            placeholder={screen.placeholder}
            onChange={(event) => onChangeText(event.target.value)}
            className="min-h-tap w-full rounded-2xl border-2 border-violet-200 px-4 text-body
                       text-ink placeholder:text-slate-500 focus:border-violet-600 focus:outline-none"
          />
          <div className="mt-auto pt-8">
            <Button
              fullWidth
              disabled={firstName.trim().length === 0}
              onClick={() => {
                capture('onboarding_step_completed', {
                  step: screen.step,
                  answer: 'first_name_provided',
                });
                onContinue();
              }}
            >
              Continuer
            </Button>
          </div>
        </>
      );

    case 'transition':
      return (
        <>
          <AnimatedCounter to={screen.counterTo} suffix={screen.counterSuffix} />
          <h2 className="mt-6 text-display-lg">{screen.title}</h2>
          {screen.subtitle && <p className="mt-3 text-body text-slate-500">{screen.subtitle}</p>}
          <div className="mt-auto pt-8">
            <Button fullWidth onClick={onContinue}>
              Continuer
            </Button>
          </div>
        </>
      );

    case 'skeleton':
      return (
        <>
          <h2 className="text-display-lg">{screen.title}</h2>
          <div className="mt-8">
            <SkeletonPreview onDone={onContinue} durationMs={screen.durationMs} />
          </div>
          <p className="mt-6 text-body-sm text-slate-500">Un instant…</p>
        </>
      );

    case 'summary': {
      const variants = cascadeVariants(reduced);
      const name = firstName.trim();
      return (
        <>
          <h2 className="text-display-lg">
            {name ? `${name}, voici ton profil` : 'Voici ton profil'}
          </h2>

          <ul className="mt-6 space-y-2">
            {summaryRows.map((row, position) => (
              <motion.li
                key={row.label}
                custom={position}
                variants={variants}
                initial="hidden"
                animate="visible"
                className="flex items-baseline justify-between gap-4 rounded-2xl bg-violet-50 px-4 py-3"
              >
                <span className="text-body-sm text-slate-500">{row.label}</span>
                <span className="text-body font-semibold text-violet-900">{row.value}</span>
              </motion.li>
            ))}
          </ul>

          <motion.p
            custom={summaryRows.length}
            variants={variants}
            initial="hidden"
            animate="visible"
            className="mt-6 text-display-md font-bold text-violet-900"
          >
            {cutCount} coupes sélectionnées pour toi
          </motion.p>

          <div className="mt-auto pt-8">
            <Button fullWidth onClick={onFinish}>
              Voir le résultat sur ma photo
            </Button>
            <p className="mt-3 text-center text-body-sm text-slate-500">
              Premier essai offert, sans compte.
            </p>
          </div>
        </>
      );
    }
  }
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-display-lg">{title}</h2>
      {subtitle && <p className="mt-2 text-body text-slate-500">{subtitle}</p>}
    </div>
  );
}
