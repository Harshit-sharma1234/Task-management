/**
 * Branded email templates for the onboarding flow.
 * All templates use inline CSS for maximum email client compatibility.
 */

const BRAND_COLOR = '#5e6ad2';
const BRAND_BG = '#f8f9fc';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#1a1a2e';
const TEXT_SECONDARY = '#64748b';

export function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:${BRAND_BG};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND_BG};padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:${CARD_BG};border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background-color:${BRAND_COLOR};border-radius:12px;margin-bottom:16px;">
                <span style="color:#fff;font-size:20px;font-weight:800;">T</span>
              </div>
              <div style="font-size:11px;font-weight:700;color:${TEXT_SECONDARY};text-transform:uppercase;letter-spacing:2px;">Tectome</div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 40px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                This is an automated message from Tectome. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
      <tr>
        <td style="background-color:${BRAND_COLOR};border-radius:10px;padding:14px 32px;">
          <a href="${url}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">${label}</a>
        </td>
      </tr>
    </table>`;
}

// ─── Template: New signup notification (sent to Admin/PM) ───

export function newSignupNotificationEmail(params: {
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  approvalUrl: string;
}): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};text-align:center;">
      New Employee Signup
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${TEXT_SECONDARY};text-align:center;line-height:1.6;">
      A new employee has requested access to the platform and is waiting for your approval.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8f9fc;border-radius:12px;border:1px solid #e8ecf1;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:11px;font-weight:600;color:${TEXT_SECONDARY};text-transform:uppercase;letter-spacing:1px;">Name</span><br>
                <span style="font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">${params.employeeName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:11px;font-weight:600;color:${TEXT_SECONDARY};text-transform:uppercase;letter-spacing:1px;">Email</span><br>
                <span style="font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">${params.employeeEmail}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:11px;font-weight:600;color:${TEXT_SECONDARY};text-transform:uppercase;letter-spacing:1px;">Employee ID</span><br>
                <span style="font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">${params.employeeId}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    ${ctaButton('Review & Approve', params.approvalUrl)}
    
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
      You can also open the approval dashboard at any time from the Tectome sidebar.
    </p>
  `);
}

// ─── Template: Onboarding approved (sent to employee) ───

export function onboardingApprovedEmail(params: {
  employeeName: string;
  roleName: string;
  loginUrl: string;
}): string {
  return baseLayout(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="display:inline-block;width:56px;height:56px;line-height:56px;background-color:#ecfdf5;border-radius:50%;font-size:28px;">✅</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};text-align:center;">
      Welcome to Tectome!
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:${TEXT_SECONDARY};text-align:center;line-height:1.6;">
      Hi ${params.employeeName}, your onboarding has been approved. You've been assigned the role of <strong style="color:${TEXT_PRIMARY};">${params.roleName}</strong>.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:${TEXT_SECONDARY};text-align:center;line-height:1.6;">
      You can now log in and start using the platform.
    </p>
    
    ${ctaButton('Log In to Tectome', params.loginUrl)}
  `);
}

// ─── Template: Onboarding rejected (sent to employee) ───

export function onboardingRejectedEmail(params: {
  employeeName: string;
  reason?: string;
}): string {
  const reasonBlock = params.reason
    ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fef2f2;border-radius:12px;border:1px solid #fecaca;margin-top:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <span style="font-size:11px;font-weight:600;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Reason</span><br>
          <span style="font-size:14px;color:#991b1b;line-height:1.5;">${params.reason}</span>
        </td>
      </tr>
    </table>`
    : '';

  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};text-align:center;">
      Onboarding Update
    </h1>
    <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};text-align:center;line-height:1.6;">
      Hi ${params.employeeName}, unfortunately your onboarding request could not be approved at this time. Please reach out to your team administrator for more information.
    </p>
    ${reasonBlock}
  `);
}

// ─── Template: Email Verification OTP (sent during signup) ───

export function emailVerificationEmail(params: {
  otpCode: string;
  expiresInMinutes: number;
}): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};text-align:center;">
      Verify your email
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:${TEXT_SECONDARY};text-align:center;line-height:1.6;">
      Use the following verification code to continue your registration on Tectome.
    </p>
    
    <div style="background-color:#f8f9fc;border-radius:12px;border:1px solid #e8ecf1;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:${BRAND_COLOR};margin-bottom:8px;">
        ${params.otpCode}
      </div>
      <div style="font-size:12px;color:${TEXT_SECONDARY};">
        Code expires in ${params.expiresInMinutes} minutes
      </div>
    </div>
    
    <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY};text-align:center;line-height:1.6;">
      If you didn't request this code, you can safely ignore this email.
    </p>
  `);
}
