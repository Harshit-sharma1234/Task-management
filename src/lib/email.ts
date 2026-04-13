import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Tectome <onboarding@yourdomain.com>';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email via Nodemailer with automatic retry (up to 3 attempts).
 * Used for onboarding notifications, approval emails, etc.
 */
export async function sendEmail(params: SendEmailParams) {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
      });

      console.log('[Email] Sent successfully:', info.messageId);
      return { success: true, id: info.messageId };
    } catch (err) {
      lastError = err as Error;
      console.error(`[Email] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
      }
    }
  }

  console.error('[Email] Failed after all retries:', lastError);
  return { success: false, error: lastError?.message };
}

/**
 * Send onboarding notification emails to all Admin/PM users.
 * Fire-and-forget — failures are logged but don't block the signup flow.
 */
export async function sendBulkEmails(recipients: string[], subject: string, html: string) {
  const results = await Promise.allSettled(
    recipients.map(to => sendEmail({ to, subject, html }))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
  const failed = results.length - sent;

  if (failed > 0) {
    console.warn(`[Email] Bulk send: ${sent} sent, ${failed} failed out of ${results.length}`);
  }

  return { sent, failed, total: results.length };
}
