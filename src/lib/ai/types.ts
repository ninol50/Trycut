/** Contrat unique du fournisseur IA (section 3). */

export interface GenerateInput {
  /** Identifiant de la ligne `generations` — sert de clé de corrélation. */
  generationId: string;
  /** URL signée, courte durée, de la photo source. */
  sourceImageUrl: string;
  /** Prompt déjà interpolé côté serveur. Jamais rempli par l'utilisateur. */
  prompt: string;
  /** URL que le fournisseur doit appeler à la fin du traitement. */
  webhookUrl: string;
}

export interface GenerateOutput {
  /** Identifiant du job côté fournisseur, stocké dans `provider_job_id`. */
  jobId: string;
}

export interface AiProvider {
  readonly name: string;
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

/** Codes d'erreur remontés jusqu'à l'UI (section 7.2). */
export type GenerationErrorCode =
  | 'quota'
  | 'network'
  | 'file'
  | 'no_face'
  | 'provider'
  | 'timeout';
