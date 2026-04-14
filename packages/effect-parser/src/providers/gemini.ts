import { GoogleGenAI } from "@google/genai";
import type { LLMProvider } from "./base.js";

export class GeminiProvider implements LLMProvider {
  name = "gemini-2.5-flash";
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GEMINI_API_KEY is required. Set it as env var or pass to constructor.",
      );
    }
    this.client = new GoogleGenAI({ apiKey: key });
    this.model = model ?? "gemini-2.5-flash";
  }

  async generateJSON(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return text;
  }
}
