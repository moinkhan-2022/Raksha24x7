const supportEmail = () => process.env.SUPPORT_EMAIL || 'support@raksha24x7.com';
const appUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderList = (items = []) => items.length
  ? `<ul style="margin:18px 0 0;padding-left:20px;color:#cbd5e1;line-height:1.8">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
  : '';

export const baseEmailTemplate = ({
  title,
  preheader,
  name,
  intro,
  buttonText,
  buttonUrl,
  note,
  securityText,
  list = []
}) => {
  const safeButtonUrl = buttonUrl ? escapeHtml(buttonUrl) : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:Inter,Arial,sans-serif">
    <span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader || title)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:24px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.35)">
            <tr>
              <td style="padding:30px;text-align:center;background:linear-gradient(135deg,#ff5a3d,#dc2626)">
                <div style="display:inline-grid;place-items:center;width:64px;height:64px;border-radius:20px;background:#0f172a;color:#fff;font-weight:900;font-size:30px">R</div>
                <h1 style="margin:14px 0 0;color:#fff;font-size:26px;letter-spacing:-.03em">Raksha24x7</h1>
                <p style="margin:8px 0 0;color:#ffe4df;font-size:13px">Personal Emergency Safety & Assistance Platform</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px">
                <h2 style="margin:0 0 12px;color:#fff;font-size:24px">${escapeHtml(title)}</h2>
                <p style="margin:0 0 16px;line-height:1.7;color:#cbd5e1">Hi ${escapeHtml(name || 'there')},</p>
                <p style="margin:0 0 18px;line-height:1.7;color:#cbd5e1">${intro}</p>
                ${renderList(list)}
                ${buttonUrl ? `<p style="margin:28px 0"><a href="${safeButtonUrl}" style="display:inline-block;background:#ff5a3d;color:#fff;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:800">${escapeHtml(buttonText)}</a></p>` : ''}
                ${buttonUrl ? `<p style="margin:0 0 18px;color:#94a3b8;font-size:13px;line-height:1.6">If the button does not work, copy and paste this link into your browser:<br/><a href="${safeButtonUrl}" style="color:#fb923c;word-break:break-all">${safeButtonUrl}</a></p>` : ''}
                ${note ? `<p style="margin:18px 0 0;color:#cbd5e1;line-height:1.7">${note}</p>` : ''}
                ${securityText ? `<div style="margin-top:22px;padding:14px;border-radius:16px;background:rgba(251,146,60,.1);border:1px solid rgba(251,146,60,.25);color:#fed7aa;font-size:14px;line-height:1.6">${securityText}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,.1);color:#94a3b8;font-size:12px;line-height:1.7">
                Need help? Contact <a href="mailto:${supportEmail()}" style="color:#fb923c">${supportEmail()}</a><br/>
                <a href="${appUrl()}/privacy" style="color:#fb923c">Privacy Policy</a> &nbsp;-&nbsp; <a href="${appUrl()}/terms" style="color:#fb923c">Terms</a><br/>
                © ${new Date().getFullYear()} Raksha24x7. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const emailTemplates = {
  welcome: ({ name, dashboardUrl, completeProfileUrl }) => ({
    subject: 'Welcome to Raksha24x7',
    text: `Welcome to Raksha24x7, ${name || 'there'}! Complete your profile and keep emergency contacts updated.`,
    html: baseEmailTemplate({
      title: 'Welcome to Raksha24x7',
      preheader: 'Your safety account has been created.',
      name,
      intro: 'Your Raksha24x7 account is ready. Keep your safety profile updated so emergency tools can work faster when you need them.',
      list: ['Add trusted emergency contacts.', 'Keep your profile and mobile number up to date.', 'Use SOS and live location responsibly.'],
      buttonText: 'Complete Profile',
      buttonUrl: completeProfileUrl || dashboardUrl,
      note: dashboardUrl ? `You can also open your dashboard here: <a href="${escapeHtml(dashboardUrl)}" style="color:#fb923c">${escapeHtml(dashboardUrl)}</a>` : ''
    })
  }),
  accountCreated: ({ name, dashboardUrl }) => ({
    subject: 'Raksha24x7 account created',
    text: 'Your Raksha24x7 account has been created.',
    html: baseEmailTemplate({
      title: 'Account created',
      preheader: 'Your Raksha24x7 account was created successfully.',
      name,
      intro: 'Your account was created successfully. You can now continue setting up your safety profile.',
      buttonText: 'Open Dashboard',
      buttonUrl: dashboardUrl
    })
  }),
  verification: ({ name, verifyUrl }) => ({
    subject: 'Verify your Raksha24x7 email',
    text: `Verify your Raksha24x7 email: ${verifyUrl}`,
    html: baseEmailTemplate({
      title: 'Verify your email',
      preheader: 'Complete your Raksha24x7 account security setup.',
      name,
      intro: 'Please verify your email address to keep your Raksha24x7 account secure.',
      buttonText: 'Verify Email',
      buttonUrl: verifyUrl,
      note: 'This verification link expires in 24 hours.',
      securityText: 'If you did not create a Raksha24x7 account, you can safely ignore this email.'
    })
  }),
  passwordReset: ({ name, resetUrl }) => ({
    subject: 'Reset your Raksha24x7 password',
    text: `Reset your Raksha24x7 password: ${resetUrl}`,
    html: baseEmailTemplate({
      title: 'Reset your password',
      preheader: 'Your secure password reset link.',
      name,
      intro: 'We received a request to reset your password. Use the secure button below to create a new password.',
      buttonText: 'Reset Password',
      buttonUrl: resetUrl,
      note: 'This reset link expires in 30 minutes and can be used only once.',
      securityText: 'If you did not request a password reset, ignore this email and keep your current password.'
    })
  }),
  passwordChanged: ({ name, time, device, browser, location, secureUrl }) => ({
    subject: 'Your Raksha24x7 password was changed',
    text: `Your Raksha24x7 password was changed at ${time || 'recently'}.`,
    html: baseEmailTemplate({
      title: 'Password changed',
      preheader: 'Your Raksha24x7 password was updated.',
      name,
      intro: `Your Raksha24x7 password was changed successfully at ${escapeHtml(time || 'recently')}.`,
      list: [device ? `Device: ${device}` : '', browser ? `Browser: ${browser}` : '', location ? `Location: ${location}` : ''].filter(Boolean),
      buttonText: 'Secure My Account',
      buttonUrl: secureUrl,
      note: 'If you made this change, no further action is needed.',
      securityText: 'If you did not make this change, secure your account immediately.'
    })
  }),
  emailVerified: ({ name, dashboardUrl }) => ({
    subject: 'Raksha24x7 email verified',
    text: 'Your Raksha24x7 email has been verified.',
    html: baseEmailTemplate({
      title: 'Email verified successfully',
      preheader: 'Your Raksha24x7 account is ready.',
      name,
      intro: 'Your email has been verified. Thank you for helping keep your account secure.',
      buttonText: 'Open Dashboard',
      buttonUrl: dashboardUrl
    })
  }),
  loginSecurityAlert: ({ name, time, ip, browser, device, location, secureUrl }) => ({
    subject: 'New Raksha24x7 login detected',
    text: `New login detected at ${time || 'recently'} from ${ip || 'unknown IP'}.`,
    html: baseEmailTemplate({
      title: 'New login detected',
      preheader: 'We noticed a login to your Raksha24x7 account.',
      name,
      intro: 'A login to your Raksha24x7 account was detected. Review the details below.',
      list: [time ? `Time: ${time}` : '', ip ? `IP address: ${ip}` : '', browser ? `Browser: ${browser}` : '', device ? `Device: ${device}` : '', location ? `Approximate location: ${location}` : ''].filter(Boolean),
      buttonText: 'Secure My Account',
      buttonUrl: secureUrl,
      securityText: 'If this was you, no action is needed. If not, change your password immediately.'
    })
  }),
  emergencyAlert: ({ name, userName, userPhone, emergencyTime, emergencyType, address, latitude, longitude, accuracy, googleMapLink, directionsLink, liveTrackingLink, emergencyMessage, batteryLevel }) => ({
    subject: 'Raksha24x7 emergency alert',
    text: `SOS emergency alert from ${userName || 'Raksha24x7 user'}. Location: ${googleMapLink}. Live tracking: ${liveTrackingLink}.`,
    html: baseEmailTemplate({
      title: 'SOS Emergency Alert',
      preheader: `${userName || 'A Raksha24x7 user'} needs immediate help.`,
      name,
      intro: `<strong style="color:#fecaca">${userName || 'A Raksha24x7 user'} has activated SOS and may need immediate assistance.</strong>`,
      list: [
        `Emergency type: ${emergencyType || 'SOS'}`,
        `Phone number: ${userPhone || 'Unavailable'}`,
        `Emergency time: ${emergencyTime || 'Unavailable'}`,
        `Address: ${address || 'Unavailable'}`,
        `Coordinates: ${latitude}, ${longitude}`,
        accuracy ? `Accuracy: ${Math.round(Number(accuracy))} metres` : '',
        batteryLevel !== null && batteryLevel !== undefined ? `Battery level: ${batteryLevel}%` : '',
        emergencyMessage ? `Message: ${emergencyMessage}` : ''
      ].filter(Boolean),
      buttonText: 'Open Live Tracking',
      buttonUrl: liveTrackingLink || googleMapLink,
      note: `Open map: <a href="${googleMapLink}" style="color:#fb923c">${googleMapLink}</a>${directionsLink ? `<br/>Start navigation: <a href="${directionsLink}" style="color:#fb923c">${directionsLink}</a>` : ''}`,
      securityText: 'This is an emergency communication from Raksha24x7. If you know the sender, contact them immediately and call local emergency services if needed.'
    })
  }),
  weeklySafetyReport: ({ name }) => ({
    subject: 'Raksha24x7 weekly safety report',
    text: 'Weekly safety report template placeholder.',
    html: baseEmailTemplate({ title: 'Weekly safety report', name, intro: 'Weekly safety report emails are reserved for a future module.' })
  }),
  monthlyReport: ({ name }) => ({
    subject: 'Raksha24x7 monthly report',
    text: 'Monthly report template placeholder.',
    html: baseEmailTemplate({ title: 'Monthly report', name, intro: 'Monthly report emails are reserved for a future module.' })
  })
};
