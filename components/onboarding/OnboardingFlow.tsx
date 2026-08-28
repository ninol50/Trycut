'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ProgressBar from '@/components/onboarding/ProgressBar';
import AnimatedCounter from '@/components/onboarding/AnimatedCounter';
import SkeletonList from '@/components/onboarding/SkeletonList';
import { EASE, useTapScale } from '@/components/motion';
import { track } from '@/lib/analytics';
import {
  getSteps,
  labelFor,
  readAnswers,
  writeAnswers,
  type OnboardingAnswers,
  type OnboardingStepId,
  type OnboardingVariant,
} from '@/lib/onboarding';

interface OnboardingFlowProps {
  variant: OnboardingVariant;
  /** Nombre de styles retenus, affiché sur le récapitulatif. */
  recommendedCount: number;
}

const SUMMARY_ORDER: readonly OnboardingStepId[] = [
  'goal',
  'length',
  'texture',
  'hairline',
  'face',
  'style',
  'beard',
  'accessories',
  'boldness',
];

export default function OnboardingFlow({ variant, recommendedCount }: OnboardingFlowProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const tap = useTapScale();

  const steps = useMemo(() => getSteps(variant), [variant]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [hydrated, setHydrated] = useState(false);

  // Reprise : les réponses survivent au rechargement et à la navigation arrière.
  useEffect(() => {
    setAnswers(readAnswers());
    setHydrated(true);
  }, []);

  const step = steps[index];
  const total = steps.length;

  const persist = useCallback((next: OnboardingAnswers) => {
    setAnswers(next);
    writeAnswers(next);
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(current + 1, total - 1));
  }, [total]);

  const goBack = useCallback(() => {
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

  const commit = useCallback(
    (id: OnboardingStepId, value: string | string[], autoAdvance: boolean) => {
      const next = { ...answers, [id]: value };
      persist(next);
      track('onboarding_step_completed', {
        step: id,
        answer: Array.isArray(value) ? value.join(',') : value,
        index: index + 1,
      });
      if (autoAdvance) window.setTimeout(goNext, 250);
    },
    [answers, persist, index, goNext],
  );

  // Transition n°2 : skeleton 2s puis avancement automatique.
  useEffect(() => {
    if (!step || step.id !== 'transition_2') return;
    const timer = window.setTimeout(goNext, 2000);
    return () => window.clearTimeout(timer);
  }, [step, goNext]);

  const finish = useCallback(() => {
    track('onboarding_finished', { steps: total });
    router.push('/onboarding/photo');
  }, [router, total]);

  if (!hydrated || !step) {
    return <div className="section py-16" aria-hidden="true" />;
  }

  const variants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, x: 40 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 },
      };

  const firstName = typeof answers.first_name === 'string' ? answers.first_name : '';

  return (
    <div className="flex min-h-dvh flex-col">
      <ProgressBar current={index + 1} total={total} />

      <div className="section flex flex-1 flex-col pb-8 pt-2">
        <div className="min-h-[48px]">
          {index > 0 ? (
            <motion.button
              type="button"
              onClick={goBack}
              whileTap={tap}
              className="-ml-2 inline-flex min-h-[48px] items-center gap-1 px-2 text-sm text-slate-500"
            >
              ← Retour
            </motion.button>
          ) : null}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            {...variants}
            transition={{ duration: reduced ? 0.18 : 0.32, ease: EASE }}
            className="flex flex-1 flex-col"
          >
            {step.kind === 'transition' ? (
              <div className="flex flex-1 flex-col justify-center py-8">
                {step.id === 'transition_1' ? (
                  <p className="mb-4">
                    <AnimatedCounter to={7} suffix=" sur 10" />
                  </p>
                ) : null}
                <h1 className="text-2xl">{step.question}</h1>
                {step.hint ? <p className="mt-3 text-base text-slate-500">{step.hint}</p> : null}
                {step.id === 'transition_2' ? <SkeletonList /> : null}
                {step.id === 'transition_1' ? (
                  <motion.button
                    type="button"
                    onClick={goNext}
                    whileTap={tap}
                    className="btn-primary mt-8 w-full"
                  >
                    Continuer
                  </motion.button>
                ) : null}
              </div>
            ) : null}

            {step.kind === 'single' || step.kind === 'multi' ? (
              <SingleOrMulti
                step={step}
                answers={answers}
                onCommit={commit}
                onNext={goNext}
              />
            ) : null}

            {step.kind === 'text' ? (
              <div className="flex flex-1 flex-col py-6">
                <h1 className="text-2xl">{step.question}</h1>
                {step.hint ? <p className="mt-2 text-base text-slate-500">{step.hint}</p> : null}
                <input
                  type="text"
                  autoComplete="given-name"
                  defaultValue={firstName}
                  placeholder={step.placeholder}
                  onChange={(event) =>
                    persist({ ...answers, first_name: event.target.value.slice(0, 40) })
                  }
                  className="mt-6 w-full rounded-2xl border border-violet-200 px-4 py-4 text-lg"
                />
                <div className="mt-auto pt-8">
                  <motion.button
                    type="button"
                    whileTap={tap}
                    onClick={() => {
                      commit('first_name', firstName, false);
                      goNext();
                    }}
                    className="btn-primary w-full"
                  >
                    Continuer
                  </motion.button>
                </div>
              </div>
            ) : null}

            {step.kind === 'summary' ? (
              <Summary
                firstName={firstName}
                answers={answers}
                recommendedCount={recommendedCount}
                onFinish={finish}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ écrans

interface ChoiceStep {
  id: OnboardingStepId;
  kind: 'single' | 'multi';
  question: string;
  hint?: string;
  choices: readonly { value: string; label: string }[];
}

function SingleOrMulti({
  step,
  answers,
  onCommit,
  onNext,
}: {
  step: ChoiceStep;
  answers: OnboardingAnswers;
  onCommit: (id: OnboardingStepId, value: string | string[], autoAdvance: boolean) => void;
  onNext: () => void;
}) {
  const tap = useTapScale();
  const current = answers[step.id];
  const selected = Array.isArray(current) ? current : typeof current === 'string' ? [current] : [];

  const toggle = (value: string) => {
    if (step.kind === 'single') {
      onCommit(step.id, value, true);
      return;
    }
    // « Aucun » est exclusif des autres réponses.
    const next =
      value === 'aucun'
        ? ['aucun']
        : selected.includes(value)
          ? selected.filter((item) => item !== value && item !== 'aucun')
          : [...selected.filter((item) => item !== 'aucun'), value];
    onCommit(step.id, next, false);
  };

  return (
    <div className="flex flex-1 flex-col py-6">
      <h1 className="text-2xl">{step.question}</h1>
      {step.hint ? <p className="mt-2 text-base text-slate-500">{step.hint}</p> : null}

      <div className="mt-6 space-y-2">
        {step.choices.map((choice) => {
          const active = selected.includes(choice.value);
          return (
            <motion.button
              key={choice.value}
              type="button"
              whileTap={tap}
              aria-pressed={active}
              onClick={() => toggle(choice.value)}
              className={`flex min-h-[56px] w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-base transition-colors ${
                active
                  ? 'border-violet-600 bg-violet-50 font-semibold text-violet-900'
                  : 'border-violet-200 bg-white text-ink'
              }`}
            >
              {choice.label}
              {active ? <span className="text-violet-600">✓</span> : null}
            </motion.button>
          );
        })}
      </div>

      {step.kind === 'multi' ? (
        <div className="mt-auto pt-8">
          <motion.button
            type="button"
            whileTap={tap}
            disabled={selected.length === 0}
            onClick={onNext}
            className="btn-primary w-full disabled:opacity-50"
          >
            Continuer
          </motion.button>
        </div>
      ) : null}
    </div>
  );
}

function Summary({
  firstName,
  answers,
  recommendedCount,
  onFinish,
}: {
  firstName: string;
  answers: OnboardingAnswers;
  recommendedCount: number;
  onFinish: () => void;
}) {
  const tap = useTapScale();
  const reduced = useReducedMotion();

  const lines = SUMMARY_ORDER.flatMap((id) => {
    const value = answers[id];
    if (!value) return [];
    const values = Array.isArray(value) ? value : [value];
    const labels = values.map((item) => labelFor(id, item)).join(', ');
    return labels ? [{ id, labels }] : [];
  });

  return (
    <div className="flex flex-1 flex-col py-6">
      <h1 className="text-2xl">
        {firstName ? `${firstName}, voici ton profil` : 'Voici ton profil'}
      </h1>

      <ul className="mt-6 space-y-2">
        {lines.map((line, position) => (
          <motion.li
            key={line.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : position * 0.06, duration: 0.32, ease: EASE }}
            className="flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3 text-sm"
          >
            <span className="text-slate-500">{SUMMARY_LABELS[line.id]}</span>
            <span className="font-semibold text-violet-900">{line.labels}</span>
          </motion.li>
        ))}
      </ul>

      <p className="mt-6 font-display text-lg font-bold text-violet-900">
        {recommendedCount} styles sélectionnés pour toi
      </p>

      <div className="mt-auto pt-8">
        <motion.button type="button" whileTap={tap} onClick={onFinish} className="btn-primary w-full">
          Importer ma photo
        </motion.button>
      </div>
    </div>
  );
}

const SUMMARY_LABELS: Record<OnboardingStepId, string> = {
  goal: 'Objectif',
  length: 'Longueur',
  texture: 'Texture',
  hairline: 'Ligne de cheveux',
  face: 'Visage',
  transition_1: '',
  style: 'Style',
  beard: 'Barbe',
  accessories: 'Accessoires',
  transition_2: '',
  boldness: 'Audace',
  first_name: 'Prénom',
  summary: '',
};
