// ============================================
// TrimedCast - Email Service
// Resend for production, console log for dev
// ============================================

import { Resend } from 'resend';

// Initialize Resend client (API key set in .env)
const resend = new Resend(process.env.RESEND_API_KEY);

// From address for all TrimedCast emails
const FROM_ADDRESS = 'TrimedCast <noreply@trimedcast.com>';
const FROM_ADDRESS_DEV = 'TrimedCast <onboarding@resend.dev>';

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

/**
 * Send an email using Resend
 * Falls back to console.log in development if no API key
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // In development without API key, just log
  if (isDev && !process.env.RESEND_API_KEY) {
    console.log('═══════════════════════════════════════');
    console.log('📧 EMAIL (DEV MODE - No Resend API Key)');
    console.log('═══════════════════════════════════════');
    console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`Subject: ${subject}`);
    console.log('═══════════════════════════════════════');
    console.log(text || html.replace(/<[^>]*>/g, '').substring(0, 500));
    console.log('═══════════════════════════════════════');
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const from = isDev ? FROM_ADDRESS_DEV : FROM_ADDRESS;
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[Email] Send failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send OTP verification email
 */
export async function sendOtpEmail(
  to: string,
  otpCode: string,
  purpose: 'signup' | 'login' | 'reset_password' | 'invite'
): Promise<{ success: boolean; error?: string }> {
  const subjects: Record<string, string> = {
    signup: 'Verify your email — TrimedCast',
    login: 'Your login code — TrimedCast',
    reset_password: 'Reset your password — TrimedCast',
    invite: 'Your invitation code — TrimedCast',
  };

  const headings: Record<string, string> = {
    signup: 'Welcome to TrimedCast!',
    login: 'Your Login Code',
    reset_password: 'Reset Your Password',
    invite: 'Your Invitation Code',
  };

  const descriptions: Record<string, string> = {
    signup: 'Enter this code to verify your email and create your account:',
    login: 'Enter this code to complete your login:',
    reset_password: 'Enter this code to reset your password:',
    invite: 'Enter this code to accept your team invitation:',
  };

  const subject = subjects[purpose];
  const heading = headings[purpose];
  const description = descriptions[purpose];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🔶 TrimedCast</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px;">Seasonal Demand & Inventory Forecasting</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1a1a1a;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#666;line-height:1.5;">${description}</p>
              
              <!-- OTP Code -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  ${otpCode.split('').map((digit: string) => `
                  <td style="width:48px;height:56px;background:#fff7ed;border:2px solid #f97316;border-radius:10px;text-align:center;font-size:24px;font-weight:700;color:#1a1a1a;margin:0 3px;">${digit}</td>
                  `).join('')}
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:14px;color:#888;text-align:center;">⏱ This code expires in <strong style="color:#f97316;">5 minutes</strong></p>
              
              <div style="border-top:1px solid #f0f0f0;margin-top:24px;padding-top:20px;">
                <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
                  If you didn't request this code, you can safely ignore this email. 
                  Someone might have entered your email address by mistake.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                TrimedCast — Seasonal Demand Forecasting for Bangladesh Motorcycle Parts<br>
                মোটরসাইকেল পার্টস ডিলারের ঋতুভিত্তিক চাহিদা পূর্বাভাসন সিস্টেম
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${heading}\n\n${description}\n\nYour code: ${otpCode}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, ignore this email.\n\n— TrimedCast`;

  const result = await sendEmail({ to, subject, html, text });
  return { success: result.success, error: result.error };
}

/**
 * Send welcome email after account creation
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  acId: string,
  shopName: string,
  division: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Welcome to TrimedCast! Your account is ready 🎉';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
              <div style="font-size:24px;font-weight:700;color:#ffffff;">🔶 TrimedCast</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px;">Seasonal Demand & Inventory Forecasting</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1a1a1a;">Welcome, ${name}! 🎉</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#666;line-height:1.5;">
                Your TrimedCast account is ready. Here are your details:
              </p>
              
              <!-- Account Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:13px;color:#9a3412;margin-bottom:8px;">YOUR ACCOUNT ID</div>
                    <div style="font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:1px;font-family:monospace;">${acId}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 16px 16px;">
                    <div style="font-size:13px;color:#666;">Shop: <strong>${shopName}</strong></div>
                    <div style="font-size:13px;color:#666;">Division: <strong>${division.charAt(0).toUpperCase() + division.slice(1)}</strong></div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;color:#666;line-height:1.5;">
                <strong>Save your Account ID: <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">${acId}</code></strong><br>
                All team members will use this ID to login.
              </p>

              <div style="border-top:1px solid #f0f0f0;margin-top:24px;padding-top:20px;">
                <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1a1a;">What's next?</p>
                <ol style="margin:0;padding-left:20px;font-size:14px;color:#666;line-height:1.8;">
                  <li>Upload your product & sales data (Excel/CSV)</li>
                  <li>See your first seasonal forecast</li>
                  <li>Get smart order recommendations</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                You have a <strong>14-day free trial</strong> with full access to all features.<br>
                TrimedCast — মোটরসাইকেল পার্টস ডিলারের ঋতুভিত্তিক চাহিদা পূর্বাভাসন
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const result = await sendEmail({ to, subject, html, text: `Welcome to TrimedCast!\n\nYour Account ID: ${acId}\nShop: ${shopName}\nDivision: ${division}\n\nSave your Account ID — all team members will use it to login.\n\nYou have a 14-day free trial with full access.` });
  return { success: result.success, error: result.error };
}

/**
 * Send team invitation email
 */
export async function sendInviteEmail(
  to: string,
  inviterName: string,
  shopName: string,
  acId: string,
  inviteToken: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const acceptUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

  const subject = `${inviterName} invited you to join ${shopName} on TrimedCast`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
              <div style="font-size:24px;font-weight:700;color:#ffffff;">🔶 TrimedCast</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1a1a1a;">You're Invited! 🤝</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#666;line-height:1.5;">
                <strong>${inviterName}</strong> has invited you to join <strong>${shopName}</strong> on TrimedCast.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:13px;color:#888;">ACCOUNT ID</div>
                    <div style="font-size:18px;font-weight:700;color:#1a1a1a;font-family:monospace;">${acId}</div>
                    <div style="font-size:13px;color:#888;margin-top:8px;">YOUR ROLE</div>
                    <div style="font-size:15px;font-weight:600;color:#f97316;text-transform:capitalize;">${role.replace('_', ' ')}</div>
                  </td>
                </tr>
              </table>

              <a href="${acceptUrl}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;margin-bottom:16px;">Accept Invitation →</a>
              
              <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
                This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">TrimedCast — Seasonal Demand Forecasting for BD Motorcycle Parts</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const result = await sendEmail({ to, subject, html, text: `${inviterName} invited you to join ${shopName} on TrimedCast.\n\nAccount ID: ${acId}\nRole: ${role}\n\nAccept here: ${acceptUrl}\n\nThis invitation expires in 7 days.` });
  return { success: result.success, error: result.error };
}

/**
 * Send subscription expiry reminder
 */
export async function sendSubscriptionReminderEmail(
  to: string,
  name: string,
  daysLeft: number,
  acId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = daysLeft <= 0
    ? 'Your TrimedCast subscription has expired'
    : `Your TrimedCast subscription expires in ${daysLeft} days`;

  const isExpired = daysLeft <= 0;
  const urgency = daysLeft <= 3 ? '🔴' : daysLeft <= 7 ? '🟡' : '🟢';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;">
          <div style="font-size:24px;font-weight:700;color:#ffffff;">🔶 TrimedCast</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1a1a1a;">${urgency} ${isExpired ? 'Subscription Expired' : `Renewal Reminder`}</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#666;line-height:1.5;">
            ${isExpired
              ? 'Your TrimedCast Pro subscription has expired. Your account has been moved to the free tier.'
              : `Hi ${name}, your Pro subscription expires in <strong>${daysLeft} days</strong>.`
            }
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#666;">
            Account: <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">${acId}</code>
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/upgrade" style="display:inline-block;background:#f97316;color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">Renew Subscription — ৳12,000/yr</a>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 40px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#999;text-align:center;">TrimedCast — Seasonal Demand Forecasting</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const result = await sendEmail({ to, subject, html, text: `${urgency} ${isExpired ? 'Subscription Expired' : `Renewal Reminder — ${daysLeft} days left`}\n\nAccount: ${acId}\nRenew at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/upgrade\n\nCost: ৳12,000/year` });
  return { success: result.success, error: result.error };
}
