export type CatalogCategory = 'cut' | 'color' | 'accessory';
export type GenerationStatus = 'queued' | 'processing' | 'succeeded' | 'failed';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled';
export type Plan = 'free' | 'pack' | 'pass';
export type CreditReason =
  | 'signup_bonus'
  | 'generation'
  | 'refund'
  | 'pack_grant'
  | 'subscription_grant';

export type GenerationErrorCode =
  | 'quota'
  | 'network'
  | 'file'
  | 'no_face'
  | 'provider'
  | 'timeout';

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
  /** Accès accordé à la main par le propriétaire du site. */
  access_status: 'pending' | 'approved' | 'rejected';
  is_admin: boolean;
  created_at: string;
}

/** Ce que le client peut voir. `prompt_template` en est volontairement absent :
 *  la colonne n'est pas lisible par anon/authenticated côté Postgres non plus. */
export type PublicCatalogItem = Omit<CatalogItem, 'prompt_template'>;

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

export interface Generation {
  id: string;
  user_id: string | null;
  anon_token: string | null;
  catalog_item_id: string | null;
  source_path: string;
  result_path: string | null;
  status: GenerationStatus;
  error_code: GenerationErrorCode | null;
  error_message: string | null;
  provider_job_id: string | null;
  credits_cost: number;
  created_at: string;
  completed_at: string | null;
}

export interface OnboardingResponseRow {
  id: string;
  user_id: string;
  answers: Record<string, unknown>;
  completed_at: string | null;
}

export interface CreditLedgerRow {
  id: string;
  user_id: string;
  delta: number;
  reason: CreditReason;
  generation_id: string | null;
  created_at: string;
}
