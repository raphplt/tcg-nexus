export interface LLMProvider {
  name: string;
  /**
   * Send a prompt and get a JSON string response.
   * The provider must handle JSON mode / structured output.
   */
  generateJSON(systemPrompt: string, userPrompt: string): Promise<string>;
}
