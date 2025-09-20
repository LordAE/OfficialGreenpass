// src/components/utils/invoiceSender.js
import { SendEmail } from '@/api/integrations';
import { format } from 'date-fns';

/* ---------- helpers ---------- */

const toDate = (v) => {
  try {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate(); // Firestore Timestamp
    const d = new Date(v);
    return Number.isFinite(d?.getTime?.()) ? d : null;
  } catch {
    return null;
  }
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

/* ---------- template ---------- */

const generateInvoiceHtml = (registration, event, payment) => {
  const paidAt =
    toDate(payment?.verified_at) ||
    toDate(payment?.created_date) ||
    new Date();

  const paymentDate = format(paidAt, 'MMMM dd, yyyy');
  const amountPaid = Number(payment?.amount_usd ?? payment?.amount ?? 0).toFixed(2);
  const method = firstNonEmpty(payment?.provider, '')
    .replace(/_/g, ' ')
    .trim();

  const rName =
    firstNonEmpty(
      registration?.contact_name,
      registration?.full_name,
      registration?.name
    ) || 'Guest';

  const rEmail =
    firstNonEmpty(
      registration?.contact_email,
      registration?.email,
      payment?.payer_email
    );

  const role = firstNonEmpty(registration?.role, '');
  const reservation = firstNonEmpty(registration?.reservation_code, '');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#333;line-height:1.6}
    .container{max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,.07);background:#fff}
    .header{text-align:center;margin-bottom:25px;padding-bottom:25px;border-bottom:2px solid #f0f0f0}
    .header img{max-width:150px;margin-bottom:10px}
    .header h1{color:#10b981;margin:0;font-size:28px;font-weight:700}
    .invoice-details,.item-details{width:100%;border-collapse:collapse}
    .invoice-details td,.item-details td,.item-details th{padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:left}
    .item-details th{font-weight:600;color:#555}
    .align-right{text-align:right}
    .total-section{text-align:right;margin-top:25px}
    .total-section p{margin:5px 0;font-weight:600}
    .total-amount{font-size:1.4em;color:#10b981}
    .footer{text-align:center;font-size:.85em;color:#888;margin-top:30px;padding-top:20px;border-top:1px solid #f0f0f0}
    .qr-section{text-align:center;margin-top:20px;padding:20px;background:#f9fafb;border-radius:8px}
  </style></head><body><div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/52125f442_GP2withnameTransparent.png" alt="GreenPass" />
      <h1>Payment Confirmed</h1>
    </div>

    <h3>Hi ${rName},</h3>
    <p>Your payment has been successfully verified for <strong>${event?.title || 'your event'}</strong>. Here are your receipt details.</p>

    <table class="invoice-details">
      <tr><td><strong>Invoice ID:</strong></td><td class="align-right">${firstNonEmpty(payment?.id, '')}</td></tr>
      <tr><td><strong>Reservation Code:</strong></td><td class="align-right">${reservation}</td></tr>
      <tr><td><strong>Payment Date:</strong></td><td class="align-right">${paymentDate}</td></tr>
      <tr><td><strong>Billed To:</strong></td><td class="align-right">${rName}<br>${rEmail}</td></tr>
    </table>

    <br/>

    <table class="item-details">
      <thead><tr><th>Description</th><th class="align-right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>Event Registration: ${event?.title || ''}${role ? ` (${role})` : ''}</td>
          <td class="align-right">$${amountPaid} USD</td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <p>Total Paid: <span class="total-amount">$${amountPaid} USD</span></p>
      <p style="font-size:0.9em;color:#777;font-weight:normal;">Paid via ${method || '—'}</p>
    </div>

    ${registration?.qr_code_url ? `
      <div class="qr-section">
        <h3>Your Check-in QR Code</h3>
        <p>Present this code at the event entrance for quick check-in.</p>
        <img src="${registration.qr_code_url}" alt="Your QR Code" style="max-width:150px" />
      </div>
    ` : ''}

    <div class="footer">
      <p>If you have any questions, please reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} GreenPass. All rights reserved.</p>
    </div>
  </div></body></html>`;
};

/* ---------- main export ---------- */

export const sendEventRegistrationInvoice = async (registration, event, payment) => {
  // choose best recipient (works for non-auth/guests too)
  const toEmail = firstNonEmpty(
    registration?.contact_email,
    registration?.email,
    payment?.payer_email
  );

  if (!toEmail) {
    console.warn('No recipient email found for invoice.', { registration, payment });
    return { success: false, skipped: true, error: 'No recipient email available.' };
  }

  if (!event || !payment) {
    return { success: false, error: 'Missing event/payment data.' };
  }

  const html = generateInvoiceHtml(registration || {}, event || {}, payment || {});
  const text = stripHtml(html);

  // 🔴 IMPORTANT: use a verified sender on your provider
  const FROM_EMAIL = 'no-reply@your-verified-domain.com'; // <— change to your verified domain
  const FROM_NAME = 'GreenPass Events';

  const payload = {
    to: toEmail,
    subject: `✅ Payment Confirmed for ${event?.title || 'Your Event'}`,
    html,
    text,
    body: html, // some wrappers expect `body` for HTML
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    from_name: FROM_NAME,
    reply_to: 'support@your-verified-domain.com',
    headers: { 'X-GreenPass-Reason': 'EventRegistrationInvoice' },
  };

  // retry transient issues; exit early on provider restrictions
  let attempt = 0;
  while (attempt < 3) {
    try {
      const res = await SendEmail(payload);
      const messageId = res?.id || res?.messageId || res?.data?.id || 'unknown';
      return { success: true, id: messageId };
    } catch (err) {
      const msg = err?.message || String(err);
      // don’t retry when the provider blocks (unverified domain, sandbox, etc.)
      if (/unauthorized|sandbox|domain|verify|not\s+allowed|suppressed/i.test(msg)) {
        return { success: false, error: msg };
      }
      attempt += 1;
      if (attempt >= 3) return { success: false, error: msg };
      await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }
};
