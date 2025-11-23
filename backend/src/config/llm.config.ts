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
export const llm = new AiSdkLlm(openaiModelInstance.chat(config.OPENAI_MODEL));

// Custom fetch to fix message formatting
const customFetch = async (url: string, options: any) => {
  console.log('--- ORIGINAL REQUEST ---');
  console.log('URL:', url);
  // console.log('BODY:', options.body); // Commented out to reduce noise if needed, but keeping for now

  let newUrl = url;
  // Fix URL if it is wrong (SDK seems to be using /responses for some reason, or maybe it's a config issue)
  if (url.includes('/responses')) {
     newUrl = url.replace('/responses', '/chat/completions');
  }

  if (options.method === 'POST' && options.body) {
    try {
      let body = JSON.parse(options.body);
      
      // Fix 'input' vs 'messages' mismatch if SDK sends 'input'
      if (body.input && !body.messages) {
        body.messages = body.input;
        delete body.input;
      }

      if (body.messages) {
        body.messages = body.messages.map((msg: any) => {
          if (Array.isArray(msg.content)) {
            // Convert array content back to string if it's just text
            const text = msg.content
              .filter((c: any) => c.type === 'text' || c.type === 'input_text')
              .map((c: any) => c.text)
              .join('\n');
            return { ...msg, content: text };
          }
          return msg;
        });
        options.body = JSON.stringify(body);
      }
    } catch (e) {
      console.error('Error in customFetch transformation:', e);
    }
  }
  
  console.log('--- MODIFIED REQUEST ---');
  console.log('URL:', newUrl);
  console.log('BODY:', options.body);
  console.log('----------------------------');
  
  const response = await fetch(newUrl, options);
  
  // Intercept response to fix usage fields for AI SDK compatibility
  if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
    try {
      // Clone to read body without consuming the original response yet
      const clone = response.clone();
      const data = await clone.json();
      
      if (data.usage) {
        // Map OpenAI standard fields to what the SDK apparently wants (input_tokens/output_tokens)
        if (data.usage.input_tokens === undefined) {
          data.usage.input_tokens = data.usage.prompt_tokens || 0;
        }
        if (data.usage.output_tokens === undefined) {
          data.usage.output_tokens = data.usage.completion_tokens || 0;
        }
      }
      
      console.log('--- CUSTOM FETCH RESPONSE (MODIFIED) ---');
      console.log('Status:', response.status);
      // console.log('Body:', JSON.stringify(data, null, 2)); // Optional: log full body
      console.log('Usage:', JSON.stringify(data.usage));
      console.log('--------------------------------------');

      const newHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        newHeaders[key] = value;
      });
      delete newHeaders['content-encoding'];
      delete newHeaders['transfer-encoding'];
      delete newHeaders['content-length'];

      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (e) {
      console.error('Error processing response in customFetch:', e);
    }
  }
  
  return response;
};

// Create a separate LLM instance for the Scanner Agent if configured
const scannerModelInstance = createOpenAI({
  apiKey: config.SCANNER_API_KEY || config.OPENAI_API_KEY,
  baseURL: config.SCANNER_BASE_URL || config.OPENAI_BASE_URL,
  fetch: customFetch,
} as any);

export const scannerLlm = new AiSdkLlm(scannerModelInstance.chat(config.SCANNER_MODEL || config.OPENAI_MODEL));
