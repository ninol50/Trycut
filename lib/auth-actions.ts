'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';

export interface AuthFormState {
  error: string | null;
  notice: string | null;
}

const GENERIC_ERROR = 'Impossible de continuer pour le moment. Réessaie dans un instant.';

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase n’est pas encore configuré sur cet environnement.', notice: null };
  }

  const email = readString(formData, 'email');
  const password = readString(formData, 'password');
  const firstName = readString(formData, 'first_name');
  const ageConfirmed = formData.get('age_confirmed') === 'on';

  if (!email || !password) {
    return { error: 'Renseigne ton email et un mot de passe.', notice: null };
  }
  if (password.length < 8) {
    return { error: 'Le mot de passe doit faire au moins 8 caractères.', notice: null };
  }
  if (!ageConfirmed) {
    return { error: 'Tu dois avoir 15 ans ou plus pour créer un compte.', notice: null };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName || null, age_confirmed: true },
      emailRedirectTo: `${env.siteUrl}/api/auth/callback?next=/app`,
    },
  });

  if (error) {
    return { error: error.message || GENERIC_ERROR, notice: null };
  }

  return {
    error: null,
    notice:
      'Compte créé. Ouvre l’email de confirmation : ton crédit offert est débloqué à la vérification.',
  };
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase n’est pas encore configuré sur cet environnement.', notice: null };
  }

  const email = readString(formData, 'email');
  const password = readString(formData, 'password');

  if (!email || !password) {
    return { error: 'Renseigne ton email et ton mot de passe.', notice: null };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Email ou mot de passe incorrect.', notice: null };
  }

  revalidatePath('/', 'layout');
  redirect('/app');
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
