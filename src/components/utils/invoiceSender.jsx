import { SendEmail } from '@/api/integrations';
import { format } from 'date-fns';

const generateInvoiceHtml = (registration, event, payment) => {
    const paymentDate = format(new Date(payment.verified_at || payment.created_date), 'MMMM dd, yyyy');
    const amountPaid = payment.amount_usd.toFixed(2);
    const paymentMethod = payment.provider.replace('_', ' ');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.07); background: #ffffff; }
        .header { text-align: center; margin-bottom: 25px; padding-bottom: 25px; border-bottom: 2px solid #f0f0f0; }
        .header img { max-width: 150px; margin-bottom: 10px; }
        .header h1 { color: #10b981; margin: 0; font-size: 28px; font-weight: 700;}
        .invoice-details, .item-details { width: 100%; border-collapse: collapse; }
        .invoice-details td, .item-details td, .item-details th { padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: left; }
        .item-details th { font-weight: 600; color: #555;}
        .align-right { text-align: right; }
        .total-section { text-align: right; margin-top: 25px;}
        .total-section p { margin: 5px 0; font-weight: 600; }
        .total-amount { font-size: 1.4em; color: #10b981; }
        .footer { text-align: center; font-size: 0.85em; color: #888; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
        .qr-section { text-align: center; margin-top: 20px; padding: 20px; background: #f9fafb; border-radius: 8px;}
        .qr-section h3 { margin-top: 0; color: #333;}
        .qr-section img { max-width: 150px; margin: 10px auto; }
        strong { font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/52125f442_GP2withnameTransparent.png" alt="GreenPass Logo">
          <h1>Payment Confirmed</h1>
        </div>
        
        <h3>Hi ${registration.contact_name},</h3>
        <p>Your payment has been successfully verified for the event: <strong>${event.title}</strong>. Please find your receipt details below.</p>
        
        <table class="invoice-details">
          <tr><td><strong>Invoice ID:</strong></td><td class="align-right">${payment.id}</td></tr>
          <tr><td><strong>Reservation Code:</strong></td><td class="align-right">${registration.reservation_code}</td></tr>
          <tr><td><strong>Payment Date:</strong></td><td class="align-right">${paymentDate}</td></tr>
          <tr><td><strong>Billed To:</strong></td><td class="align-right">${registration.contact_name}<br>${registration.contact_email}</td></tr>
        </table>
        
        <br>
        
        <table class="item-details">
          <thead><tr><th>Description</th><th class="align-right">Amount</th></tr></thead>
          <tbody><tr><td>Event Registration: ${event.title} (${registration.role})</td><td class="align-right">$${amountPaid} USD</td></tr></tbody>
        </table>
        
        <div class="total-section">
          <p>Total Paid: <span class="total-amount">$${amountPaid} USD</span></p>
          <p style="font-size: 0.9em; color: #777; font-weight: normal;">Paid via ${paymentMethod}</p>
        </div>

        ${registration.qr_code_url ? `
        <div class="qr-section">
            <h3>Your Check-in QR Code</h3>
            <p>Present this code at the event entrance for quick check-in.</p>
            <img src="${registration.qr_code_url}" alt="Your QR Code">
        </div>
        ` : ''}
        
        <div class="footer">
          <p>If you have any questions, please contact our support team.</p>
          <p>&copy; ${new Date().getFullYear()} GreenPass. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};


export const sendEventRegistrationInvoice = async (registration, event, payment) => {
    if (!registration || !event || !payment) {
        console.error("Missing data for sending invoice.", { registration, event, payment });
        return { success: false, error: "Missing data" };
    }

    // Skip email sending for guest registrations as they don't have a user account
    if (registration.is_guest_registration) {
        console.log(`Skipping invoice email for guest registration: ${registration.contact_email}`);
        return { success: true, message: "Guest registration, email skipped." };
    }

    const htmlBody = generateInvoiceHtml(registration, event, payment);

    try {
        await SendEmail({
            to: registration.contact_email,
            from_name: "GreenPass Events",
            subject: `✅ Payment Confirmed for ${event.title}`,
            body: htmlBody
        });
        console.log(`Invoice sent successfully to ${registration.contact_email}`);
        return { success: true };
    } catch (error) {
        const errorMessage = error.message || "An unknown error occurred";
        console.error(`Failed to send invoice to ${registration.contact_email}:`, errorMessage);
        
        return { success: false, error: errorMessage };
    }
};