import nodemailer from 'nodemailer';

/**
 * SMTP Configuration
 *
 * ⚠️  PORT GUIDANCE FOR PRODUCTION (Vercel / serverless):
 *   - Port 465 (SSL)      → Often BLOCKED by cloud providers. Causes "Greeting never received".
 *   - Port 587 (STARTTLS) → RECOMMENDED. Almost never blocked. Use this in production.
 *   - Port 2525           → Alternative fallback if 587 is also blocked.
 *
 * Set SMTP_PORT=587 in your Vercel environment variables.
 */
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587'); // Default changed to 587
const SMTP_SECURE = SMTP_PORT === 465; // true only for port 465

const CONNECTION_TIMEOUT_MS = 10_000; // 10s — max time to establish TCP connection
const GREETING_TIMEOUT_MS  = 15_000; // 15s — max time to receive SMTP greeting (220 banner)
const SOCKET_TIMEOUT_MS    = 20_000; // 20s — max idle time on open socket

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,           // false for 587 (STARTTLS upgrades after connect)
  requireTLS: !SMTP_SECURE,      // enforce STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,   // allow self-signed / corporate certs
  },
  // ── Timeouts (critical for serverless) ─────────────────────────────────────
  connectionTimeout: CONNECTION_TIMEOUT_MS,
  greetingTimeout:   GREETING_TIMEOUT_MS,
  socketTimeout:     SOCKET_TIMEOUT_MS,
});

const FROM_ADDRESS = process.env.EMAIL_FROM || `Tectome <${process.env.SMTP_USER}>`;

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  source?: string;
}

// ── Deduplication cache (60-second cooldown) ────────────────────────────────
const dedupeCache = new Map<string, number>();

/**
 * Verify the SMTP connection and log detailed diagnostics.
 * Call this once at startup or before sending if you suspect connectivity issues.
 */
export async function verifySmtpConnection(): Promise<boolean> {
  const ts = () => new Date().toISOString();
  console.log(`[${ts()}] [SMTP:Verify] 🔌 Checking TCP connection to ${SMTP_HOST}:${SMTP_PORT}...`);
  console.log(`[${ts()}] [SMTP:Verify]    secure=${SMTP_SECURE} | requireTLS=${!SMTP_SECURE}`);
  console.log(`[${ts()}] [SMTP:Verify]    connectionTimeout=${CONNECTION_TIMEOUT_MS}ms | greetingTimeout=${GREETING_TIMEOUT_MS}ms | socketTimeout=${SOCKET_TIMEOUT_MS}ms`);
  console.log(`[${ts()}] [SMTP:Verify]    user=${process.env.SMTP_USER}`);

  try {
    const start = Date.now();
    await transporter.verify();
    const elapsed = Date.now() - start;
    console.log(`[${ts()}] [SMTP:Verify] ✅ Connection OK (${elapsed}ms) — ready to send`);
    return true;
  } catch (err: any) {
    console.error(`[${ts()}] [SMTP:Verify] ❌ Connection FAILED:`, err.message);
    console.error(`[${ts()}] [SMTP:Verify]    Error code: ${err.code || 'N/A'}`);
    console.error(`[${ts()}] [SMTP:Verify]    💡 Tip: If error is "Greeting never received", port ${SMTP_PORT} may be blocked.`);
    console.error(`[${ts()}] [SMTP:Verify]    💡 Try setting SMTP_PORT=587 (STARTTLS) in your environment variables.`);
    return false;
  }
}

/**
 * Send an email via SMTP with automatic retry (up to 3 attempts).
 * Includes detailed TCP/TLS/SMTP diagnostic logs.
 */
export async function sendEmail(params: SendEmailParams) {
  const recipientKey = Array.isArray(params.to) ? params.to.join(',') : params.to;
  const dedupeKey   = `${recipientKey}:${params.subject}`;
  const now         = Date.now();
  const source      = params.source || 'Unknown';
  const ts          = () => new Date().toISOString();

  // ── Deduplication ──────────────────────────────────────────────────────────
  if (dedupeCache.has(dedupeKey)) {
    const lastSent = dedupeCache.get(dedupeKey)!;
    if (now - lastSent < 60_000) {
      console.log(`[${ts()}] [Email] [${source}] 🛡️ Dedup: skipping duplicate to ${recipientKey}`);
      return { success: true, id: 'deduped' };
    }
  }
  dedupeCache.set(dedupeKey, now);

  // ── Pre-send diagnostics ───────────────────────────────────────────────────
  console.log(`[${ts()}] [Email] [${source}] ─────────────────────────────────────`);
  console.log(`[${ts()}] [Email] [${source}] 🚀 Sending email`);
  console.log(`[${ts()}] [Email] [${source}]    To      : ${recipientKey}`);
  console.log(`[${ts()}] [Email] [${source}]    Subject : ${params.subject}`);
  console.log(`[${ts()}] [Email] [${source}]    SMTP    : ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})`);
  console.log(`[${ts()}] [Email] [${source}]    From    : ${FROM_ADDRESS}`);

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    console.log(`[${ts()}] [Email] [${source}] ⏳ Attempt ${attempt}/${MAX_RETRIES} — opening TCP connection...`);

    try {
      const isHighPriority =
        params.priority === 'high' || params.subject.toLowerCase().includes('verification');

      const info = await transporter.sendMail({
        from:     FROM_ADDRESS,
        to:       Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject:  params.subject,
        html:     params.html,
        replyTo:  params.replyTo,
        priority: isHighPriority ? 'high' : 'normal',
        headers:  isHighPriority ? {
          'X-Priority':        '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance':        'high',
        } : {},
      });

      const elapsed = Date.now() - attemptStart;
      console.log(`[${ts()}] [Email] [${source}] ✅ Sent OK (Attempt ${attempt}/${MAX_RETRIES}) in ${elapsed}ms`);
      console.log(`[${ts()}] [Email] [${source}]    Message-ID : ${info.messageId}`);
      console.log(`[${ts()}] [Email] [${source}]    Response   : ${info.response}`);
      console.log(`[${ts()}] [Email] [${source}] ─────────────────────────────────────`);
      return { success: true, id: info.messageId };

    } catch (err: any) {
      lastError = err;
      const elapsed = Date.now() - attemptStart;
      const code    = err.code || 'N/A';
      const msg     = err.message || 'Unknown error';

      console.error(`[${ts()}] [Email] [${source}] ❌ FAILED (Attempt ${attempt}/${MAX_RETRIES}) after ${elapsed}ms`);
      console.error(`[${ts()}] [Email] [${source}]    Error   : ${msg}`);
      console.error(`[${ts()}] [Email] [${source}]    Code    : ${code}`);

      // ── Diagnostic hints ───────────────────────────────────────────────────
      if (msg.includes('Greeting never received') || msg.includes('ETIMEDOUT') || code === 'ETIMEDOUT') {
        console.error(`[${ts()}] [Email] [${source}]    🔴 TCP TIMEOUT: Port ${SMTP_PORT} is likely BLOCKED by your cloud provider.`);
        console.error(`[${ts()}] [Email] [${source}]    💡 FIX: Set SMTP_PORT=587 in Vercel env vars and redeploy.`);
      } else if (msg.includes('ECONNREFUSED') || code === 'ECONNREFUSED') {
        console.error(`[${ts()}] [Email] [${source}]    🔴 CONNECTION REFUSED: SMTP host ${SMTP_HOST}:${SMTP_PORT} actively rejected connection.`);
      } else if (msg.includes('ENOTFOUND') || code === 'ENOTFOUND') {
        console.error(`[${ts()}] [Email] [${source}]    🔴 DNS FAILURE: Cannot resolve host "${SMTP_HOST}". Check SMTP_HOST env var.`);
      } else if (msg.includes('certificate') || msg.includes('TLS') || msg.includes('SSL')) {
        console.error(`[${ts()}] [Email] [${source}]    🔴 TLS/SSL ERROR: Certificate or handshake issue.`);
      } else if (msg.includes('limit') || msg.includes('quota') || code === 'EENVELOPE') {
        console.warn(`[${ts()}] [Email] [${source}]    ⚠️  QUOTA/LIMIT: Gmail daily sending limit may be exceeded. Aborting retries.`);
        break;
      } else if (msg.includes('535') || msg.includes('Username and Password not accepted')) {
        console.error(`[${ts()}] [Email] [${source}]    🔴 AUTH FAILED: SMTP credentials rejected. Check SMTP_USER / SMTP_PASSWORD env vars.`);
        break; // No point retrying bad credentials
      }

      if (attempt < MAX_RETRIES) {
        const delay = 1000 * attempt;
        console.log(`[${ts()}] [Email] [${source}]    ↩️  Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  console.error(`[${ts()}] [Email] [${source}] 💀 All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`);
  console.error(`[${ts()}] [Email] [${source}] ─────────────────────────────────────`);
  return { success: false, error: lastError?.message || 'Failed after retries' };
}

/**
 * Send notification emails to multiple recipients.
 */
export async function sendBulkEmails(recipients: string[], subject: string, html: string) {
  const results = await Promise.allSettled(
    recipients.map(to => sendEmail({ to, subject, html }))
  );

  const sent   = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
  const failed = results.length - sent;

  if (failed > 0) {
    console.warn(`[Email] Bulk send: ${sent} sent, ${failed} failed out of ${results.length}`);
  }

  return { sent, failed, total: results.length };
}
