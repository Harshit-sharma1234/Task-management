import nodemailer from 'nodemailer';
console.log('Testing SMTP configuration...');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function test() {
  try {
    // verify connection configuration
    await transporter.verify();
    console.log('Server is ready to take our messages');
  } catch (error) {
    console.error('SMTP Verification Error:', error.message);
    console.log('\nNOTE: This is expected if you haven\'t added valid credentials to .env yet.');
  }
}

test();
