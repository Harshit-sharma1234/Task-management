import nodemailer from 'nodemailer';

/**
 * Configure the SMTP transporter for Gmail.
 * Using Port 465 with SSL for maximum reliability.
 */
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_SECURE = SMTP_PORT === 465; // True for 465, false for 587

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  // Add TLS options for better compatibility with different servers
  tls: {
    rejectUnauthorized: false, // Helps with some corporate environments/Outlook
  },
});

const FROM_ADDRESS = process.env.EMAIL_FROM || `Tectome <${process.env.SMTP_USER}>`;

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Send an email via SMTP with automatic retry (up to 3 attempts).
 * Optimized for high deliverability to Outlook/Gmail.
 */
// In-memory cache to prevent duplicate emails within a short window (60 seconds)
const dedupeCache = new Map<string, number>();

export async function sendEmail(params: SendEmailParams & { source?: string }) {
  const recipientKey = Array.isArray(params.to) ? params.to.join(',') : params.to;
  const dedupeKey = `${recipientKey}:${params.subject}`;
  const now = Date.now();
  const timestamp = new Date().toISOString();
  const source = params.source || 'Unknown';
  
  if (dedupeCache.has(dedupeKey)) {
    const lastSent = dedupeCache.get(dedupeKey)!;
    if (now - lastSent < 60000) { // 60 second cooldown
      console.log(`[${timestamp}] [Email] [${source}] 🛡️ Deduplication: Skipping duplicate email to ${recipientKey}`);
      return { success: true, id: 'deduped' }; 
    }
  }
  
  dedupeCache.set(dedupeKey, now);
  console.log(`[${timestamp}] [Email] [${source}] 🚀 Attempting to send to ${recipientKey}...`);
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const isHighPriority = params.priority === 'high' || params.subject.toLowerCase().includes('verification');
      
      const info = await transporter.sendMail({
        from: FROM_ADDRESS,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
        priority: isHighPriority ? 'high' : 'normal',
        headers: isHighPriority ? {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        } : {},
      });

      console.log(`[Email] ✅ SUCCESS (Attempt ${attempt}/${MAX_RETRIES}):`, info.messageId);
      return { success: true, id: info.messageId };
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message || 'Unknown error';
      console.error(`[Email] ❌ FAILED (Attempt ${attempt}/${MAX_RETRIES}):`, errorMessage);
      
      // If we hit a quota limit, STOP RETRYING immediately to save the remaining quota
      if (errorMessage.includes('limit') || errorMessage.includes('quota') || err.code === 'EENVELOPE') {
        console.warn('[Email] Quota limit detected. Aborting retries.');
        break;
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * attempt;
        console.log(`[Email] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return { success: false, error: lastError?.message || 'Failed after retries' };
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
