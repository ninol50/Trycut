'use client';

import posthog from 'posthog-js';
import { publicEnv } from '@/lib/public-env';

/**
 * Les 9 events obligatoires (section 12), plus les deux que le nouveau
 * parcours rend indispensables. Aucun autre nom n'est accepté.
 *
 * Depuis que le studio s'ouvre avant paiement, l'entonnoir a deux marches de
 * plus : la photo choisie (elle ne quitte pas le navigateur, donc
 * `photo_uploaded` ne se déclenche pas) et le mur du paiement atteint. Sans
 * ces deux-là, impossible de savoir si les gens abandonnent avant de choisir
 * une coupe ou devant le prix — c'est-à-dire impossible d'arbitrer entre
 * retoucher le studio et retoucher les offres.
 */
export type AnalyticsEvent =
  | 'landing_cta_clicked'
  | 'demo_video_viewed'
  | 'onboarding_step_completed'
  | 'onboarding_finished'
  | 'photo_selected'
  | 'photo_uploaded'
  | 'paywall_hit'
  | 'first_generation_succeeded'
  | 'signup_completed'
  | 'share_clicked'
  | 'checkout_completed';

type Props = Record<string, string | number | boolean | null | undefined | string[]>;

let initialized = false;

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return;
  if (!publicEnv.posthogKey) {
    initialized = true;
    return;
  }
  posthog.init(publicEnv.posthogKey, {
    api_host: publicEnv.posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
  initialized = true;
}

/** Chaque event porte `variant` pour comparer les deux parcours d'onboarding. */
export function track(event: AnalyticsEvent, props: Props = {}): void {
  const payload: Props = { ...props, variant: publicEnv.onboardingLength };
  if (!publicEnv.posthogKey) {
    console.debug('[analytics]', event, payload);
    return;
  }
  posthog.capture(event, payload);
}

export function identify(userId: string, props: Props = {}): void {
  if (!publicEnv.posthogKey) return;
  posthog.identify(userId, props);
}

export function resetAnalytics(): void {
  if (!publicEnv.posthogKey) return;
  posthog.reset();
}
