// Transactional email via Zoho ZeptoMail (SMTP) — used for the notification
// digest (#26/#71). ZeptoMail chosen over a generic provider (Resend) since
// Chris already owns progrowthtech.com in the Zoho ecosystem; Zoho's own
// docs explicitly steer automated/app-triggered sending away from regular
// Zoho Mail (meant for 1:1 business correspondence) toward ZeptoMail.
// Skips cleanly (no error) if the SMTP env vars aren't set, matching the
// pattern used by bestbuy.js for its optional API key.
import nodemailer from 'nodemailer'

let transporter

function getTransporter() {
  if (transporter) return transporter
  const { ZEPTOMAIL_SMTP_HOST, ZEPTOMAIL_SMTP_PORT, ZEPTOMAIL_SMTP_USER, ZEPTOMAIL_SMTP_PASS } = process.env
  if (!ZEPTOMAIL_SMTP_HOST || !ZEPTOMAIL_SMTP_USER || !ZEPTOMAIL_SMTP_PASS) return null

  transporter = nodemailer.createTransport({
    host: ZEPTOMAIL_SMTP_HOST,
    port: Number(ZEPTOMAIL_SMTP_PORT || 587),
    secure: Number(ZEPTOMAIL_SMTP_PORT) === 465,
    auth: { user: ZEPTOMAIL_SMTP_USER, pass: ZEPTOMAIL_SMTP_PASS },
  })
  return transporter
}

export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter()
  if (!t) {
    console.log('[email] ZEPTOMAIL_SMTP_* not set in .env.local — skipping send.')
    return { skipped: true }
  }

  const from = process.env.MAIL_FROM || 'do.not.reply@progrowthtech.com'
  const info = await t.sendMail({ from, to, subject, html, text })
  return { messageId: info.messageId }
}
