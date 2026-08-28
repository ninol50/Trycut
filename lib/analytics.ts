'use client';

import posthog from 'posthog-js';
import { env } from '@/lib/env';

/** Les 9 events obligatoires (section 12). Aucun autre nom n'est accepté. */
export type AnalyticsEvent =
  | 'landing_cta_clicked'
  | 'demo_video_viewed'
  | 'onboarding_step_completed'
  | 'onboarding_finished'
  | 'photo_uploaded'
  | 'first_generation_succeeded'
  | 'signup_completed'
  | 'share_clicked'
  | 'checkout_completed';

type Props = Record<string, string | number | boolean | null | undefined | string[]>;

let initialized = false;

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return;
  if (!env.posthogKey) {
    initialized = true;
    return;
  }
  posthog.init(env.posthogKey, {
    api_host: env.posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
  initialized = true;
}

/** Chaque event porte `variant` pour comparer les deux parcours d'onboarding. */
export function track(event: AnalyticsEvent, props: Props = {}): void {
  const payload: Props = { ...props, variant: env.onboardingLength };
  if (!env.posthogKey) {
    console.debug('[analytics]', event, payload);
    return;
  }
  posthog.capture(event, payload);
}

export function identify(userId: string, props: Props = {}): void {
  if (!env.posthogKey) return;
  posthog.identify(userId, props);
}

export function resetAnalytics(): void {
  if (!env.posthogKey) return;
  posthog.reset();
}
