'use client';

import posthog from 'posthog-js';

/**
 * Les 8 events obligatoires (section 12).
 * Le type union empêche d'inventer un nom au fil de l'eau : un event mal nommé
 * est un event qu'on ne retrouvera jamais dans le funnel.
 */
export type AnalyticsEvent =
  | 'landing_cta_clicked'
  | 'onboarding_step_completed'
  | 'onboarding_finished'
  | 'photo_uploaded'
  | 'first_generation_succeeded'
  | 'signup_completed'
  | 'share_clicked'
  | 'checkout_completed';

export type EventProperties = Record<string, string | number | boolean | string[] | null>;

export function capture(event: AnalyticsEvent, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export function identify(userId: string, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return;
  posthog.identify(userId, properties);
}

export function resetIdentity(): void {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return;
  posthog.reset();
}
