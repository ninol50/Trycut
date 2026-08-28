'use client';

import { useEffect } from 'react';
import { readAnswers } from '@/lib/onboarding';

const SYNC_FLAG = 'trycut_onboarding_synced';

/**
 * Remonte les réponses stockées en local vers la base, une seule fois,
 * dès que le compte existe.
 */
export default function OnboardingSync() {
  useEffect(() => {
    let alreadySynced = false;
    try {
      alreadySynced = window.localStorage.getItem(SYNC_FLAG) === 'true';
    } catch {
      return;
    }
    if (alreadySynced) return;

    const answers = readAnswers();
    if (Object.keys(answers).length === 0) return;

    void fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
      .then((response) => {
        if (response.ok) window.localStorage.setItem(SYNC_FLAG, 'true');
      })
      .catch(() => {
        // Réessayé au prochain passage sur /app.
      });
  }, []);

  return null;
}
