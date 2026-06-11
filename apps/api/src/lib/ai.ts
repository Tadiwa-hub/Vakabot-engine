export class AIClient {
  private groqKey: string | undefined;
  private cerebrasKey: string | undefined;

  constructor(groqKey?: string, cerebrasKey?: string) {
    this.groqKey = groqKey;
    this.cerebrasKey = cerebrasKey;
  }

  async generateResponse(systemPrompt: string, conversationHistory: {role: string, content: string}[]): Promise<string> {
    const providers = [
      {
        name: "Groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: this.groqKey,
        models: [
          "llama-3.3-70b-versatile",
          "llama-3.1-8b-instant",
          "mixtral-8x7b-32768",
          "gemma2-9b-it"
        ]
      },
      {
        name: "Cerebras",
        url: "https://api.cerebras.ai/v1/chat/completions",
        key: this.cerebrasKey,
        models: [
          "gpt-oss-120b",
          "zai-glm-4.7"
        ]
      }
    ];

    let attemptedAny = false;

    for (const provider of providers) {
      if (!provider.key) {
        console.log(`[AI] Skipping provider ${provider.name} (API key not configured)`);
        continue;
      }

      attemptedAny = true;

      for (const model of provider.models) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for ultra-fast failover

        try {
          console.log(`[AI] Attempting ${provider.name} with model: ${model}`);
          const response = await fetch(provider.url, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${provider.key}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory
              ],
              temperature: 0.7,
              max_tokens: 150
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.text();
            console.warn(`[AI] ${provider.name} model ${model} failed (${response.status}):`, error);
            continue;
          }

          const data = await response.json() as any;
          const result = data.choices?.[0]?.message?.content;
          
          if (result && result.trim().length > 0) {
            console.log(`[AI] Successfully generated response using ${provider.name} (${model})`);
            return result.trim();
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          console.warn(`[AI] Error with ${provider.name} model ${model}:`, err.message);
        }
      }
    }

    if (!attemptedAny) {
      throw new Error("No AI provider API keys configured.");
    }

    throw new Error("All AI models across Groq and Cerebras failed to respond.");
  }
}
