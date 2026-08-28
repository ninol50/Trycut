/**
 * Types de la base — écrits à la main et alignés sur `supabase/migrations/`.
 * Régénérables via `supabase gen types typescript`, mais le fichier manuel
 * reste la référence pour éviter une dépendance CLI dans le build.
 */

export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled';
export type Plan = 'free' | 'pass';
export type GenerationStatus = 'queued' | 'processing' | 'succeeded' | 'failed';
export type CatalogCategory = 'cut' | 'color' | 'accessory';
export type CreditReason =
  | 'signup_bonus'
  | 'generation'
  | 'refund'
  | 'pack_purchase'
  | 'subscription_grant';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  plan: Plan;
  current_period_end: string | null;
  credits_remaining: number;
  photo_retention_optin: boolean;
  signup_bonus_granted: boolean;
  age_confirmed: boolean;
  created_at: string;
}

export interface OnboardingResponseRow {
  id: string;
  user_id: string;
  answers: Record<string, unknown>;
  completed_at: string | null;
}

export interface Generation {
  id: string;
  user_id: string;
  catalog_item_id: string;
  source_path: string;
  result_path: string | null;
  status: GenerationStatus;
  error_code: string | null;
  error_message: string | null;
  provider_job_id: string | null;
  credits_cost: number;
  watermarked: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface CatalogItem {
  id: string;
  slug: string;
  label: string;
  category: CatalogCategory;
  style_tags: string[];
  prompt_template: string;
  preview_path: string;
  is_premium: boolean;
  sort_order: number;
}

export interface CreditLedgerRow {
  id: string;
  user_id: string;
  delta: number;
  reason: CreditReason;
  generation_id: string | null;
  created_at: string;
}

export interface DailySpendRow {
  date: string;
  generation_count: number;
  estimated_cost_cents: number;
}

/** Retour de la fonction Postgres `consume_credit`. */
export interface ConsumeCreditResult {
  ok: boolean;
  reason: 'consumed' | 'no_credits' | 'daily_cap_reached' | 'rate_limited';
  credits_remaining: number;
}

/** Retour de la fonction Postgres `start_generation`. */
export interface StartGenerationResult {
  ok: boolean;
  reason:
    | 'started'
    | 'no_credits'
    | 'daily_cap_reached'
    | 'rate_limited'
    | 'unknown_catalog_item'
    | 'premium_locked';
  generation_id: string | null;
  credits_remaining: number;
}
