import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const html = `
  <div style="font-family:Arial,sans-serif;background:#0f172a;padding:24px;color:#e2e8f0">
    <div style="max-width:620px;margin:0 auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:24px">
      <h2 style="margin:0 0 12px;color:#fff">Raksha24x7 Password Reset</h2>
      <p>Hi ${name || 'User'},</p>
      <p>Click the button below to reset your password. This link expires in 15 minutes.</p>
      <p style="margin:24px 0"><a href="${resetUrl}" style="background:#dc2626;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Reset Password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
      <hr style="border-color:rgba(255,255,255,.15)"/>
      <p style="font-size:12px;color:#94a3b8">Raksha24x7 • Safety First</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: 'Reset your Raksha24x7 password',
    html
  });
};
