import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

async function finalTest() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const config = Object.fromEntries(
      env.split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => {
          let [key, ...val] = line.split('=');
          let value = val.join('=').trim().replace(/^["']|["']$/g, '');
          return [key, value];
        })
    );

    const supabase = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(config.RESEND_API_KEY);

    const testEmail = 'integration_test_' + Date.now() + '@example.com';
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log('--- Phase 1: Database Check ---');
    console.log('Attempting to save OTP to database for:', testEmail);

    const { error: dbError } = await supabase
      .from('email_otps')
      .upsert({
        email: testEmail,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        verified: false
      });

    if (dbError) {
      console.error('❌ DB Failure:', dbError.message);
      return;
    }
    console.log('✅ DB Success: OTP saved.');

    console.log('\n--- Phase 2: Email Check ---');
    console.log('Attempting to send email via Resend...');

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: config.EMAIL_FROM || 'onboarding@resend.dev',
      to: 'delivered@resend.dev',
      subject: `Integration Test: ${otpCode}`,
      html: `Your integration test code is: <strong>${otpCode}</strong>`
    });

    if (emailError) {
      console.error('❌ Email Failure:', emailError.message);
    } else {
      console.log('✅ Email Success: Sent with ID:', emailData.id);
    }

    // Cleanup
    await supabase.from('email_otps').delete().eq('email', testEmail);
    console.log('\n--- Final Result: ALL SYSTEMS GO ---');

  } catch (err) {
    console.error('Critical Script Error:', err.message);
  }
}

finalTest();
