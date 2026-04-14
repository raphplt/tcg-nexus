import type { LLMProvider } from "./base.js";

/**
 * Anthropic Claude provider.
 * Requires: ANTHROPIC_API_KEY env var.
 */
export class AnthropicProvider implements LLMProvider {
  name: string;
  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = opts?.model ?? "claude-sonnet-4-6";
    this.name = this.model;

    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required.");
    }
  }

  async generateJSON(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8192,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return jsonMatch ? jsonMatch[1].trim() : text;
  }
}
