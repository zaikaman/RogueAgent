import { AiSdkLlm } from '@iqai/adk';
import { createOpenAI } from '@ai-sdk/openai';
import { config } from './env.config';

// Create an OpenAI provider instance with a custom base URL
const openaiModelInstance = createOpenAI({
  apiKey: config.OPENAI_API_KEY,
  baseURL: config.OPENAI_BASE_URL,
});

// Wrap the provider in AiSdkLlm
// We use the model name from config, defaulting to gpt-4o
export const llm = new AiSdkLlm(openaiModelInstance(config.OPENAI_MODEL));
