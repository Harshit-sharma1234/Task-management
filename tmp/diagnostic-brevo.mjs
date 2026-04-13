import fs from 'fs';
import nodemailer from 'nodemailer';

async function diagnosticTest() {
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

    const targetEmail = 'harshit.sharma@tectome.co.uk'; 
    console.log('--- DIAGNOSTIC TEST ---');
    console.log('Target Email:', targetEmail);
    console.log('Sender Email:', config.EMAIL_FROM);

    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
      debug: true, // Show full SMTP traffic
      logger: true, // Log to console
    });

    console.log('\nStarting SMTP handshake...');

    const info = await transporter.sendMail({
      from: config.EMAIL_FROM || 'Tectome <nainanikapil1@gmail.com>',
      to: targetEmail,
      subject: '🚨 FINAL DIAGNOSTIC: Brevo SMTP Test',
      html: `
        <h2>SMTP Diagnostic Test</h2>
        <p>If you are reading this, the Brevo SMTP relay is working perfectly.</p>
        <p><strong>Configured Sender:</strong> ${config.EMAIL_FROM}</p>
        <p><strong>Authenticated User:</strong> ${config.SMTP_USER}</p>
      `
    });

    console.log('\n✅ SUCCESS: Email accepted by Brevo relay.');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);

  } catch (err) {
    console.error('\n❌ SMTP ERROR:', err.message);
    if (err.message.includes('Sender address rejected')) {
      console.log('\nTIP: Brevo requires you to verify the "From" address in their dashboard (Senders & Domains).');
    }
  }
}

diagnosticTest();
