export class EvolutionClient {
  private config: { url: string; key: string };

  constructor(config: { url: string; key: string }) {
    this.config = config;
  }

  private async request(endpoint: string, method = "GET", body?: any) {
    const url = `${this.config.url}${endpoint}`;
    
    console.log(`[Evolution] ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        "apikey": this.config.key,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API Error Body:", errorText);
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async createInstance(instanceName: string) {
    return this.request("/instance/create", "POST", {
      instanceName,
      pairingCode: true,
      integration: "WHATSAPP-BAILEYS"
    });
  }

  async getConnectData(instanceName: string) {
    return this.request(`/instance/connect/${instanceName}`, "GET");
  }

  async getPairingCode(instanceName: string, phoneNumber: string) {
    // Sanitize: digits only (strip + as well, as some versions prefer it)
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    return this.request(`/instance/connect/${instanceName}?number=${cleanNumber}&method=pairingCode`, "GET");
  }

  async setWebhook(instanceName: string, webhookUrl: string) {
    return this.request(`/webhook/set/${instanceName}`, "POST", {
      webhook: {
        enabled: true,
        url: webhookUrl,
        events: [
          "MESSAGES_UPSERT",
          "QRCODE_UPDATED",
          "CONNECTION_UPDATE",
          "PRESENCE_UPDATE"
        ]
      }
    });
  }

  async logoutInstance(instanceName: string) {
    return this.request(`/instance/logout/${instanceName}`, "DELETE");
  }

  async deleteInstance(instanceName: string) {
    return this.request(`/instance/delete/${instanceName}`, "DELETE");
  }

  async sendMessage(instanceName: string, jid: string, text: string, delay = 0) {
    console.log(`[Evolution] Sending to: ${jid} | Text: ${text.substring(0, 30)}... | Delay: ${delay}ms`);
    return this.request(`/message/sendText/${instanceName}`, "POST", {
      number: jid,
      text: text,
      delay: delay,
      linkPreview: false // Force off for speed
    });
  }

  async sendPresence(instanceName: string, jid: string, state: "composing" | "recording" | "paused" | "available") {
    // Note: Some v2 versions 404 on this. We rely on 'delay' in sendMessage for auto-typing.
    try {
      return await this.request(`/chat/updatePresence/${instanceName}`, "POST", {
        number: jid,
        presence: state
      });
    } catch (e) {
      console.warn(`[Evolution] sendPresence failed (likely disabled on engine): ${e.message}`);
      return { success: true, status: "MOCKED" };
    }
  }

  async markRead(instanceName: string, jid: string) {
    try {
      return await this.request(`/chat/markRead/${instanceName}`, "POST", {
        number: jid,
        read: true
      });
    } catch (e) {
      console.warn(`[Evolution] markRead failed (likely disabled on engine): ${e.message}`);
      return { success: true, status: "MOCKED" };
    }
  }

  async getContactProfile(instanceName: string, jid: string) {
    return this.request(`/contact/profile/${instanceName}?number=${jid}`);
  }

  async fetchInstances() {
    return this.request("/instance/fetchInstances");
  }
}



// Removed singleton export for Worker compatibility
