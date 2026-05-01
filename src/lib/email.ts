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
  const sendStart = Date.now(); // track total time across all attempts

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    const cumulative   = () => `cumulative=${Date.now() - sendStart}ms`;

    console.log(`[${ts()}] [Email] [${source}] ┌── RETRY ${attempt}/${MAX_RETRIES} ─────────────────────────────`);
    console.log(`[${ts()}] [Email] [${source}] │ ⏳ [TCP]  Connecting to ${SMTP_HOST}:${SMTP_PORT}...`);

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

      const attemptMs = Date.now() - attemptStart;
      const totalMs   = Date.now() - sendStart;
      console.log(`[${ts()}] [Email] [${source}] │ ✅ [SENT] attempt=${attempt}/${MAX_RETRIES} attempt_time=${attemptMs}ms total_time=${totalMs}ms`);
      console.log(`[${ts()}] [Email] [${source}] │    Message-ID   : ${info.messageId}`);
      console.log(`[${ts()}] [Email] [${source}] │    SMTP Response: ${info.response}`);
      console.log(`[${ts()}] [Email] [${source}] │    Envelope     : from=${info.envelope?.from} to=${JSON.stringify(info.envelope?.to)}`);
      console.log(`[${ts()}] [Email] [${source}] └─── SUCCESS ─────────────────────────────────`);
      return { success: true, id: info.messageId };

    } catch (err: any) {
      lastError = err;
      const attemptMs   = Date.now() - attemptStart;
      const code        = err.code        || 'N/A';
      const msg         = err.message     || 'Unknown error';
      const command     = err.command     || 'N/A';  // nodemailer: which SMTP command failed
      const responseCode= err.responseCode|| 'N/A';  // nodemailer: SMTP numeric response code
      const response    = err.response    || 'N/A';  // nodemailer: full SMTP response string

      console.error(`[${ts()}] [Email] [${source}] │ ❌ [FAIL] attempt=${attempt}/${MAX_RETRIES} attempt_time=${attemptMs}ms ${cumulative()}`);
      console.error(`[${ts()}] [Email] [${source}] │    Error         : ${msg}`);
      console.error(`[${ts()}] [Email] [${source}] │    Error Code    : ${code}`);
      console.error(`[${ts()}] [Email] [${source}] │    SMTP Command  : ${command}   ← which phase failed`);
      console.error(`[${ts()}] [Email] [${source}] │    SMTP RespCode : ${responseCode}`);
      console.error(`[${ts()}] [Email] [${source}] │    SMTP Response : ${response}`);

      // ── Diagnostic hints ───────────────────────────────────────────────────
      if (msg.includes('Greeting never received') || msg.includes('ETIMEDOUT') || code === 'ETIMEDOUT') {
        console.error(`[${ts()}] [Email] [${source}] │    🔴 PHASE: TCP connect timed out — port ${SMTP_PORT} may still be blocked.`);
        console.error(`[${ts()}] [Email] [${source}] │    💡 TRY : SMTP_PORT=2525 as fallback, or use a transactional email service.`);
      } else if (msg.includes('ECONNREFUSED') || code === 'ECONNREFUSED') {
        console.error(`[${ts()}] [Email] [${source}] │    🔴 PHASE: TCP — ${SMTP_HOST}:${SMTP_PORT} actively refused connection.`);
      } else if (msg.includes('ENOTFOUND') || code === 'ENOTFOUND') {
        console.error(`[${ts()}] [Email] [${source}] │    🔴 PHASE: DNS — cannot resolve "${SMTP_HOST}". Check SMTP_HOST env var.`);
      } else if (command === 'STARTTLS' || msg.includes('certificate') || msg.includes('TLS') || msg.includes('SSL')) {
        console.error(`[${ts()}] [Email] [${source}] │    🔴 PHASE: TLS handshake failed (command=${command}).`);
      } else if (command === 'AUTH' || msg.includes('535') || msg.includes('Username and Password not accepted')) {
        console.error(`[${ts()}] [Email] [${source}] │    🔴 PHASE: AUTH — credentials rejected. Check SMTP_USER / SMTP_PASSWORD.`);
        console.error(`[${ts()}] [Email] [${source}] └─── ABORTING (no retry — bad credentials) ───────────`);
        break;
      } else if (msg.includes('limit') || msg.includes('quota') || code === 'EENVELOPE') {
        console.warn(`[${ts()}] [Email] [${source}] │    ⚠️  PHASE: ENVELOPE/QUOTA — Gmail sending limit exceeded.`);
        console.warn(`[${ts()}] [Email] [${source}] └─── ABORTING (no retry — quota) ─────────────────────`);
        break;
      }

      if (attempt < MAX_RETRIES) {
        const delayMs = 1000 * attempt;
        console.log(`[${ts()}] [Email] [${source}] │    ⏱  Waiting ${delayMs}ms before retry ${attempt + 1}/${MAX_RETRIES}... (${cumulative()})`);
        await new Promise(r => setTimeout(r, delayMs));
        console.log(`[${ts()}] [Email] [${source}] │    ↩️  Wait complete — starting retry ${attempt + 1}/${MAX_RETRIES}`);
      }

      console.error(`[${ts()}] [Email] [${source}] └─────────────────────────────────────────────────`);
    }
  }

  const totalMs = Date.now() - sendStart;
  console.error(`[${ts()}] [Email] [${source}] ╳ ALL ${MAX_RETRIES} ATTEMPTS FAILED — total_time=${totalMs}ms`);
  console.error(`[${ts()}] [Email] [${source}]   Last error : ${lastError?.message}`);
  console.error(`[${ts()}] [Email] [${source}]   Last code  : ${(lastError as any)?.code || 'N/A'}`);
  console.error(`[${ts()}] [Email] [${source}] ─────────────────────────────────────────────────`);
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
