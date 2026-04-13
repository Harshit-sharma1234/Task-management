import fs from 'fs';
import nodemailer from 'nodemailer';

async function runTest() {
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

    console.log('Testing Brevo SMTP with Login:', config.SMTP_USER);

    const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(config.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASSWORD,
        },
      });

    const info = await transporter.sendMail({
      from: config.EMAIL_FROM || 'Tectome <nainanikapil1@gmail.com>',
      to: config.SMTP_USER, // Send to self for verification
      subject: 'Brevo SMTP Connection Test',
      text: 'Success! Your Brevo SMTP is configured correctly via Nodemailer.'
    });

    console.log('✅ SUCCESS: Email sent! ID:', info.messageId);
    console.log('Check your Brevo dashboard or the inbox for:', config.SMTP_USER);

  } catch (err) {
    console.error('❌ FAILURE:', err.message);
  }
}

runTest();
