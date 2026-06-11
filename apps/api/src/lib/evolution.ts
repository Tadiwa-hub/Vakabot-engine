export class EvolutionClient {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  private async request(endpoint: string, method = "GET", body = null) {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "apikey": this.key,
      },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${this.url}${endpoint}`, options);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Evolution API Error (${res.status}): ${errorText}`);
    }
    return res.json();
  }

  async createInstance(instanceName: string) {
    return this.request("/instance/create", "POST", {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: false,
      pairingNumber: true
    });
  }

  async connectInstance(instanceName: string) {
    // Basic connect without number triggers QR, but we usually call getPairingCode directly
    return this.request(`/instance/connect/${instanceName}`, "GET");
  }

  async getPairingCode(instanceName: string, phoneNumber: string) {
    // Per documentation: GET with number query param triggers the 8-digit pairing code
    return this.request(`/instance/connect/${instanceName}?number=${phoneNumber}`, "GET");
  }

  async getInstanceData(instanceName: string) {
    return this.request(`/instance/connectionState/${instanceName}`);
  }

  async deleteInstance(instanceName: string) {
    return this.request(`/instance/delete/${instanceName}`, "DELETE");
  }

  async sendMessage(instanceName: string, number: string, text: string, delay?: number) {
    const payload: any = {
      number,
      text,
      linkPreview: true
    };
    if (delay) payload.delay = delay;
    
    return this.request(`/message/sendText/${instanceName}`, "POST", payload);
  }

  async sendPresence(instanceName: string, number: string, presence: "composing" | "recording" | "paused", delay = 1200) {
    return this.request(`/chat/sendPresence/${instanceName}`, "POST", {
      number,
      presence,
      delay
    });
  }

  async setWebhook(instanceName: string, webhookUrl: string) {
    return this.request(`/webhook/set/${instanceName}`, "POST", {
      webhook: {
        url: webhookUrl,
        enabled: true,
        headers: {
          "Bypass-Tunnel-Reminder": "true"
        },
        events: [
          "MESSAGES_UPSERT",
          "CONNECTION_UPDATE",
          "PRESENCE_UPDATE"
        ]
      }
    });
  }
}
