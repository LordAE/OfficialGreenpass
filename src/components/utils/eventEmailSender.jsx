// src/components/utils/eventEmailSender.js
import { SendEmail } from '@/api/integrations';

const toDate = (v) => {
  try {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate(); // Firestore Timestamp
    const d = new Date(v);
    return Number.isFinite(d?.getTime?.()) ? d : null;
  } catch { return null; }
};

const stripHtml = (html) =>
  (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(div|p|h\d|li|br)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const firstNonEmpty = (...vals) =>
  vals.find((v) => typeof v === 'string' && v.trim().length > 0) || '';

/**
 * Confirmation email (after payment “paid”).
 * @param {object} registration
 * @param {object} event
 * @param {object} payment  (optional; used for amount_usd fallback)
 * @param {object} opts     { appBaseUrl?: string, fromEmail?: string, fromName?: string }
 */
export const sendEventRegistrationConfirmation = async (
  registration,
  event,
  payment,
  opts = {}
) => {
  const to = firstNonEmpty(
    registration?.contact_email,
    registration?.email,
    payment?.payer_email
  );
  if (!to) return { success: false, skipped: true, error: 'No recipient email.' };

  const fromEmail = opts.fromEmail || 'no-reply@your-verified-domain.com'; // <- change to verified domain
  const fromName  = opts.fromName  || 'GreenPass Events';
  const appBase   = opts.appBaseUrl || 'https://app.greenpass.example';    // <- set your real base URL

  const amountUsd = Number(registration?.amount_usd ?? payment?.amount_usd ?? 0).toFixed(2);
  const startDate = toDate(event?.start);
  const dateStr   = startDate ? startDate.toLocaleString() : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Event Registration Confirmation</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0}
  .container{max-width:600px;margin:0 auto;padding:20px}
  .header{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{background:#fff;padding:30px 20px;border:1px solid #e5e7eb}
  .footer{background:#f9fafb;padding:20px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none}
  .qr-section{background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;text-align:center;border-radius:8px;margin:20px 0}
  .details-table{width:100%;border-collapse:collapse;margin:20px 0}
  .details-table th,.details-table td{padding:12px;text-align:left;border-bottom:1px solid #e5e7eb}
  .details-table th{background:#f9fafb;font-weight:600}
  .button{display:inline-block;background:#10b981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;margin:10px 0}
  .important{background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:28px">🎉 Registration Confirmed!</h1>
      <p style="margin:10px 0 0 0;font-size:16px;opacity:.9">You're all set for ${event?.title || 'your event'}</p>
    </div>
    <div class="content">
      <p>Dear ${firstNonEmpty(registration?.contact_name, 'Guest')},</p>
      <p>Great news! Your registration for <strong>${event?.title || ''}</strong> has been confirmed.</p>
      <table class="details-table">
        <tr><th>Event</th><td>${event?.title || ''}</td></tr>
        <tr><th>Date & Time</th><td>${dateStr}</td></tr>
        <tr><th>Location</th><td>${event?.location || ''}</td></tr>
        <tr><th>Registration Type</th><td>${firstNonEmpty(registration?.role, '—')}</td></tr>
        <tr><th>Confirmation Code</th><td><strong>${firstNonEmpty(registration?.reservation_code, '—')}</strong></td></tr>
        <tr><th>Amount Paid</th><td>$${amountUsd} USD</td></tr>
      </table>
      <div class="qr-section">
        <h3 style="margin-top:0;color:#059669">📱 Your Event QR Code</h3>
        <p>Your unique QR code for event check-in will be available in your GreenPass dashboard.
           You can also use your confirmation code <strong>${firstNonEmpty(registration?.reservation_code, '—')}</strong> for check-in.</p>
        <a href="${appBase}/dashboard" class="button">View in Dashboard</a>
      </div>
      <div class="important">
        <h4 style="margin-top:0;color:#92400e">📋 Important Information:</h4>
        <ul style="margin:10px 0">
          <li>Please arrive 15 minutes before the event starts</li>
          <li>Bring a valid ID for verification</li>
          <li>Your QR code or confirmation code will be required for entry</li>
        </ul>
      </div>
      ${event?.contact_details?.email ? `
        <p>If you have any questions, contact us at
          <a href="mailto:${event.contact_details.email}">${event.contact_details.email}</a>
          ${event?.contact_details?.phone ? ` or call ${event.contact_details.phone}` : ''}.
        </p>` : ''}
      <p>We look forward to seeing you at the event!</p>
      <p>Best regards,<br/>The GreenPass Team</p>
    </div>
    <div class="footer">
      <p style="margin:0;color:#6b7280;font-size:14px">This is an automated confirmation email.</p>
    </div>
  </div>
</body></html>`;

  const text = stripHtml(html);

  const payload = {
    to,
    subject: `✅ Event Registration Confirmed - ${event?.title || 'Event'}`,
    html,
    text,
    body: html, // in case your SendEmail expects `body` for HTML
    from: `${fromName} <${fromEmail}>`,
    from_name: fromName,
    reply_to: 'support@your-verified-domain.com',
    headers: { 'X-GreenPass-Reason': 'EventRegistrationConfirmation' },
  };

  try {
    const res = await SendEmail(payload);
    return { success: true, id: res?.id || res?.messageId || res?.data?.id || 'unknown' };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
};

/**
 * QR-only follow-up email (optional).
 * @param {object} registration
 * @param {object} event
 * @param {object} opts  { fromEmail?, fromName? }
 */
export const sendEventQRCode = async (registration, event, opts = {}) => {
  const to = firstNonEmpty(registration?.contact_email, registration?.email);
  if (!to) return { success: false, skipped: true, error: 'No recipient email.' };

  const fromEmail = opts.fromEmail || 'no-reply@your-verified-domain.com';
  const fromName  = opts.fromName  || 'GreenPass Events';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Event QR Code</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0}
  .container{max-width:600px;margin:0 auto;padding:20px}
  .header{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{background:#fff;padding:30px 20px;border:1px solid #e5e7eb}
  .footer{background:#f9fafb;padding:20px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none}
  .qr-section{background:#f0fdf4;border:2px solid #10b981;padding:30px;text-align:center;border-radius:8px;margin:20px 0}
</style></head>
<body>
  <div class="container">
    <div class="header"><h1 style="margin:0;font-size:24px">📱 Your Event QR Code</h1></div>
    <div class="content">
      <p>Hi ${firstNonEmpty(registration?.contact_name, 'Guest')},</p>
      <p>Use this code for quick check-in at <strong>${event?.title || ''}</strong>:</p>
      <div class="qr-section">
        <h3 style="margin-top:0;color:#059669">Quick Check-in Code</h3>
        <div style="font-size:18px;font-weight:bold;background:#fff;padding:15px;border-radius:6px;margin:15px 0">
          ${firstNonEmpty(registration?.reservation_code, '—')}
        </div>
        <p style="margin-bottom:0;color:#059669;font-weight:600">Show this code at the event entrance</p>
      </div>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Date:</strong> ${toDate(event?.start)?.toLocaleDateString?.() || ''}</li>
        <li><strong>Time:</strong> ${toDate(event?.start)?.toLocaleTimeString?.() || ''}</li>
        <li><strong>Location:</strong> ${event?.location || ''}</li>
      </ul>
      <p>Save this email or take a screenshot for easy access.</p>
      <p>See you there!</p>
    </div>
    <div class="footer"><p style="margin:0;color:#6b7280;font-size:14px">GreenPass Events Team</p></div>
  </div>
</body></html>`;

  const text = stripHtml(html);

  const payload = {
    to,
    subject: `📱 Your QR Code for ${event?.title || 'Event'}`,
    html,
    text,
    body: html,
    from: `${fromName} <${fromEmail}>`,
    from_name: fromName,
    reply_to: 'support@your-verified-domain.com',
    headers: { 'X-GreenPass-Reason': 'EventRegistrationQRCode' },
  };

  try {
    const res = await SendEmail(payload);
    return { success: true, id: res?.id || res?.messageId || res?.data?.id || 'unknown' };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
};
