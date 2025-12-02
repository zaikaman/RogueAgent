import { AiSdkLlm } from '@iqai/adk';
import { createOpenAI } from '@ai-sdk/openai';
import { config } from './env.config';

// Custom fetch to fix message formatting AND handle vision/images
const customFetch = async (url: string, options: any) => {
  // console.log('--- ORIGINAL REQUEST ---');
  // console.log('URL:', url);

  let newUrl = url;
  // Fix URL if it is wrong (SDK seems to be using /responses for some reason)
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
        let hasAnyImages = false;
        
        // Debug: Log message structure
        console.log('📝 Messages count:', body.messages.length);
        body.messages.forEach((msg: any, idx: number) => {
          console.log(`   Message ${idx}: role=${msg.role}, content type=${typeof msg.content}, isArray=${Array.isArray(msg.content)}`);
          if (Array.isArray(msg.content)) {
            msg.content.forEach((part: any, pIdx: number) => {
              const keys = Object.keys(part);
              console.log(`     Part ${pIdx}: keys=[${keys.join(', ')}]`);
            });
          }
        });
        
        body.messages = body.messages.map((msg: any) => {
          if (Array.isArray(msg.content)) {
            // Check if content has images - look for inlineData or image types
            const hasImages = msg.content.some((c: any) => 
              c.type === 'image' || c.type === 'image_url' || c.image_url || c.inlineData
            );
            
            console.log(`   hasImages check: ${hasImages}`);
            
            if (hasImages) {
              hasAnyImages = true;
              // Keep array format for vision requests, but normalize the structure
              msg.content = msg.content.map((c: any) => {
                if (c.type === 'text' || c.type === 'input_text') {
                  return { type: 'text', text: c.text };
                }
                if (c.text && !c.type) {
                  // Plain text object without type
                  return { type: 'text', text: c.text };
                }
                if (c.type === 'image_url' || c.image_url) {
                  return { type: 'image_url', image_url: c.image_url || { url: c.url } };
                }
                if (c.inlineData) {
                  // Convert ADK inlineData to OpenAI image_url format with data URI
                  console.log('🖼️ Converting inlineData to image_url format');
                  return { 
                    type: 'image_url', 
                    image_url: { 
                      url: `data:${c.inlineData.mimeType};base64,${c.inlineData.data}` 
                    } 
                  };
                }
                return c;
              });
              return msg;
            }
            
            // No images - convert array content back to string (text only)
            const text = msg.content
              .filter((c: any) => c.type === 'text' || c.type === 'input_text' || c.text)
              .map((c: any) => c.text)
              .join('\n');
            return { ...msg, content: text };
          }
          return msg;
        });
        
        if (hasAnyImages) {
          console.log('📷 Vision request detected - sending with image(s)');
        }
        
        options.body = JSON.stringify(body);
      }
    } catch (e) {
      console.error('Error in customFetch transformation:', e);
    }
  }
  
  // console.log('--- MODIFIED REQUEST ---');
  // console.log('URL:', newUrl);
  // console.log('----------------------------');
  
  const response = await fetch(newUrl, options);
  
  // Intercept response to fix usage fields for AI SDK compatibility
  if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      
      if (data.usage) {
        if (data.usage.input_tokens === undefined) {
          data.usage.input_tokens = data.usage.prompt_tokens || 0;
        }
        if (data.usage.output_tokens === undefined) {
          data.usage.output_tokens = data.usage.completion_tokens || 0;
        }
      }

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

// Create an OpenAI provider instance with custom base URL AND customFetch for vision support
const openaiModelInstance = createOpenAI({
  apiKey: config.OPENAI_API_KEY,
  baseURL: config.OPENAI_BASE_URL,
  fetch: customFetch,
} as any);

// Wrap the provider in AiSdkLlm
// We use the model name from config, defaulting to gpt-4o
export const llm = new AiSdkLlm(openaiModelInstance.chat(config.OPENAI_MODEL));

// Create a separate LLM instance for the Scanner Agent if configured
const scannerModelInstance = createOpenAI({
  apiKey: config.SCANNER_API_KEY || config.OPENAI_API_KEY,
  baseURL: config.SCANNER_BASE_URL || config.OPENAI_BASE_URL,
  fetch: customFetch,
} as any);

export const scannerLlm = new AiSdkLlm(scannerModelInstance.chat(config.SCANNER_MODEL || config.OPENAI_MODEL));
