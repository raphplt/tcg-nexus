import type { LLMProvider } from "./base.js";

/**
 * OpenAI-compatible provider (works with OpenAI, Together, Groq, etc.)
 * Requires: npm install openai
 */
export class OpenAIProvider implements LLMProvider {
  name: string;
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(opts?: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.baseURL =
      opts?.baseURL ?? "https://api.openai.com/v1";
    this.model = opts?.model ?? "gpt-4o-mini";
    this.name = this.model;

    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is required.");
    }
  }

  async generateJSON(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(
        `OpenAI API error: ${res.status} ${await res.text()}`,
      );
    }

    const data = (await res.json()) as any;
    return data.choices[0].message.content;
  }
}
