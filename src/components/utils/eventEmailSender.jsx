import { SendEmail } from '@/api/integrations';
import { QRCodeGenerator } from '../events/QRCodeGenerator';

export const sendEventRegistrationConfirmation = async (registration, event, payment) => {
  try {
    // Generate QR code data
    const qrData = {
      registrationId: registration.id,
      eventId: event.event_id,
      attendeeName: registration.contact_name,
      eventTitle: event.title,
      registrationType: registration.role,
      checkInCode: registration.reservation_code
    };

    // Generate QR code (this would need to be implemented as a server-side function)
    // For now, we'll send the confirmation without QR code embedded and mention it will be available
    
    const emailSubject = `✅ Event Registration Confirmed - ${event.title}`;
    
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Registration Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px 20px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .qr-section { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .details-table th { background: #f9fafb; font-weight: 600; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        .important { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎉 Registration Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You're all set for ${event.title}</p>
        </div>
        
        <div class="content">
            <p>Dear ${registration.contact_name},</p>
            
            <p>Great news! Your registration for <strong>${event.title}</strong> has been confirmed and your payment has been processed successfully.</p>
            
            <table class="details-table">
                <tr>
                    <th>Event</th>
                    <td>${event.title}</td>
                </tr>
                <tr>
                    <th>Date & Time</th>
                    <td>${new Date(event.start).toLocaleString()}</td>
                </tr>
                <tr>
                    <th>Location</th>
                    <td>${event.location}</td>
                </tr>
                <tr>
                    <th>Registration Type</th>
                    <td>${registration.role}</td>
                </tr>
                <tr>
                    <th>Confirmation Code</th>
                    <td><strong>${registration.reservation_code}</strong></td>
                </tr>
                <tr>
                    <th>Amount Paid</th>
                    <td>$${payment.amount_usd} USD</td>
                </tr>
            </table>

            <div class="qr-section">
                <h3 style="margin-top: 0; color: #059669;">📱 Your Event QR Code</h3>
                <p>Your unique QR code for event check-in will be available in your GreenPass dashboard. You can also use your confirmation code <strong>${registration.reservation_code}</strong> for check-in.</p>
                <a href="${window.location.origin}/dashboard" class="button">View in Dashboard</a>
            </div>

            <div class="important">
                <h4 style="margin-top: 0; color: #92400e;">📋 Important Information:</h4>
                <ul style="margin: 10px 0;">
                    <li>Please arrive 15 minutes before the event starts</li>
                    <li>Bring a valid ID for verification</li>
                    <li>Your QR code or confirmation code will be required for entry</li>
                    <li>Check your email for any event updates</li>
                </ul>
            </div>

            ${event.contact_details?.email ? `
            <p>If you have any questions, please contact us at <a href="mailto:${event.contact_details.email}">${event.contact_details.email}</a>${event.contact_details?.phone ? ` or call ${event.contact_details.phone}` : ''}.</p>
            ` : ''}

            <p>We look forward to seeing you at the event!</p>
            
            <p>Best regards,<br>
            The GreenPass Team</p>
        </div>
        
        <div class="footer">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                This is an automated confirmation email for your event registration.
            </p>
        </div>
    </div>
</body>
</html>
    `;

    await SendEmail({
      to: registration.contact_email,
      subject: emailSubject,
      body: emailBody,
      from_name: "GreenPass Events"
    });

    return true;
  } catch (error) {
    console.error('Failed to send event confirmation email:', error);
    throw error;
  }
};

export const sendEventQRCode = async (registration, event) => {
  try {
    const qrData = JSON.stringify({
      registrationId: registration.id,
      eventId: event.event_id,
      attendeeName: registration.contact_name,
      checkInCode: registration.reservation_code
    });

    const emailSubject = `📱 Your QR Code for ${event.title}`;
    
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event QR Code</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px 20px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .qr-section { background: #f0fdf4; border: 2px solid #10b981; padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📱 Your Event QR Code</h1>
        </div>
        
        <div class="content">
            <p>Hi ${registration.contact_name},</p>
            
            <p>Here's your QR code for quick check-in at <strong>${event.title}</strong>:</p>
            
            <div class="qr-section">
                <h3 style="margin-top: 0; color: #059669;">Quick Check-in Code</h3>
                <div style="font-size: 18px; font-weight: bold; background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    ${registration.reservation_code}
                </div>
                <p style="margin-bottom: 0; color: #059669; font-weight: 600;">Show this code at the event entrance</p>
            </div>

            <p><strong>Event Details:</strong></p>
            <ul>
                <li><strong>Date:</strong> ${new Date(event.start).toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${new Date(event.start).toLocaleTimeString()}</li>
                <li><strong>Location:</strong> ${event.location}</li>
            </ul>

            <p>Save this email or take a screenshot of your code for easy access at the event.</p>
            
            <p>See you there!</p>
        </div>
        
        <div class="footer">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                GreenPass Events Team
            </p>
        </div>
    </div>
</body>
</html>
    `;

    await SendEmail({
      to: registration.contact_email,
      subject: emailSubject,
      body: emailBody,
      from_name: "GreenPass Events"
    });

    return true;
  } catch (error) {
    console.error('Failed to send QR code email:', error);
    throw error;
  }
};