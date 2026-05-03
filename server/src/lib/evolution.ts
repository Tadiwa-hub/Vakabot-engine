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
      qrcode: true,
    });
  }

  async getConnectData(instanceName: string) {
    return this.request(`/instance/connect/${instanceName}`);
  }

  async setWebhook(instanceName: string, webhookUrl: string) {
    return this.request(`/webhook/set/${instanceName}`, "POST", {
      webhook: {
        enabled: true,
        url: webhookUrl,
        events: [
          "messages.upsert",
          "qrcode.updated",
          "connection.update"
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

  async sendMessage(instanceName: string, jid: string, text: string) {
    console.log(`[Evolution] Preparing to send to: ${jid}`);
    return this.request(`/message/sendText/${instanceName}`, "POST", {
      number: jid,
      text: text
    });
  }

  async getContactProfile(instanceName: string, jid: string) {
    return this.request(`/contact/profile/${instanceName}?number=${jid}`);
  }

  async fetchInstances() {
    return this.request("/instance/fetchInstances");
  }
}



// Removed singleton export for Worker compatibility
