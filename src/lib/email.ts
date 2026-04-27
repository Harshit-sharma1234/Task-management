import nodemailer from 'nodemailer';

/**
 * Configure the SMTP transporter for Gmail.
 * Using Port 465 with SSL for maximum reliability.
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Gmail uses SSL on 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Tectome <kapilnainanidev6@gmail.com>';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email via Gmail SMTP with automatic retry (up to 3 attempts).
 */
export async function sendEmail(params: SendEmailParams) {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: FROM_ADDRESS,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
      });

      console.log('[Email] Sent successfully via Gmail:', info.messageId);
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
