import { env } from '@/lib/env';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Resend est mocké tant que `RESEND_API_KEY` est absente : on log en console.
 * Aucun envoi ne doit jamais faire échouer le parcours appelant.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean }> {
  if (!env.resendApiKey) {
    console.info('[email:mock]', payload.to, '—', payload.subject);
    return { sent: false };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.resendApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });
    return { sent: response.ok };
  } catch (error) {
    console.error('[email] envoi impossible', error);
    return { sent: false };
  }
}
