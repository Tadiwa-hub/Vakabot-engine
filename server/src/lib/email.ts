export class EmailClient {
  private apiKey: string;
  private fromEmail: string = 'notifications@vakabot.pages.dev';
  private fromName: string = 'VakaBot Engine';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(to: string, subject: string, htmlContent: string) {
    if (!this.apiKey) {
      console.warn('[Email] Skipping send: No Resend API Key configured.');
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'VakaBot <onboarding@resend.dev>', // You can change this once you verify a domain
          to: [to],
          subject: subject,
          html: htmlContent
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend error: ${error}`);
      }

      console.log(`[Email] Successfully sent via Resend to ${to}: ${subject}`);
      return true;
    } catch (e) {
      console.error('[Email] Resend failed:', e);
      return false;
    }
  }

  // Preset Templates
  async sendDisconnectAlert(to: string, businessName: string) {
    const subject = `⚠️ ACTION REQUIRED: ${businessName} Disconnected`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
        <h2 style="color: #ef4444;">WhatsApp Disconnected</h2>
        <p>Hello,</p>
        <p>Your WhatsApp connection for <strong>${businessName}</strong> has been lost or logged out from your phone.</p>
        <p><strong>Impact:</strong> Your bot is currently offline and NOT replying to customers.</p>
        <div style="margin: 25px 0;">
          <a href="https://vakabot.pages.dev/dashboard" style="background: #0ea5e9; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reconnect Dashboard</a>
        </div>
        <p style="color: #666; font-size: 0.8rem;">If you did not expect this, please check your WhatsApp settings under "Linked Devices".</p>
      </div>
    `;
    return this.send(to, subject, html);
  }
}
