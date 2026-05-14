
export class PaynowClient {
  private integrationId: string;
  private integrationKey: string;
  private baseUrl = "https://www.paynow.co.zw/interface";

  constructor(id: string, key: string) {
    this.integrationId = id;
    this.integrationKey = key;
  }

  private async generateHash(data: Record<string, string>): Promise<string> {
    // 1. Concatenate values
    let values = "";
    const sortedKeys = Object.keys(data).sort();
    for (const key of sortedKeys) {
      values += data[key];
    }
    values += this.integrationKey;

    // 2. SHA512 Hash
    const msgUint8 = new TextEncoder().encode(values);
    const hashBuffer = await crypto.subtle.digest("SHA-512", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  async initiateMobile(params: {
    reference: string,
    amount: number,
    email: string,
    phone: string,
    method: 'ecocash' | 'onemoney',
    returnUrl: string,
    resultUrl: string
  }) {
    const data: any = {
      id: this.integrationId,
      reference: params.reference,
      amount: params.amount.toString(),
      additionalinfo: "VakaBot Subscription",
      returnurl: params.returnUrl,
      resulturl: params.resultUrl,
      authemail: params.email,
      phone: params.phone,
      method: params.method,
      status: 'Message'
    };

    data.hash = await this.generateHash(data);

    const formData = new URLSearchParams();
    for (const key in data) {
      formData.append(key, data[key]);
    }

    const response = await fetch(`${this.baseUrl}/initiatemobiletransaction`, {
      method: "POST",
      body: formData
    });

    const resultText = await response.text();
    return this.parseResponse(resultText);
  }

  async pollTransaction(pollUrl: string) {
    const response = await fetch(pollUrl);
    const resultText = await response.text();
    return this.parseResponse(resultText);
  }

  private parseResponse(text: string): Record<string, string> {
    const params = new URLSearchParams(text);
    const result: any = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }
}
