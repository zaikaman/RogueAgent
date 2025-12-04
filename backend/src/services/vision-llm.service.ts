/**
 * Vision LLM Service
 * 
 * Direct API calls for vision/multimodal requests.
 * The AI SDK / ADK strips out image parts from FullMessage,
 * so we need to make direct API calls for vision requests.
 */

import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

interface VisionMessage {
  role: 'user' | 'assistant' | 'system';
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
}

interface VisionRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Make a direct vision API call with images
 * Bypasses the AI SDK which strips image content
 */
export async function callVisionLLM(
  messages: VisionMessage[],
  options: VisionRequestOptions = {}
): Promise<string> {
  const {
    model = config.OPENAI_MODEL,
    temperature = 1.0,
  } = options;

  const requestBody = {
    model,
    messages,
    temperature,
  };

  logger.info(`VisionLLM: Calling ${model} with ${messages.length} messages`);
  
  // Count images
  const imageCount = messages.reduce((count, msg) => {
    if (Array.isArray(msg.content)) {
      return count + msg.content.filter(c => c.type === 'image_url').length;
    }
    return count;
  }, 0);
  
  logger.info(`VisionLLM: Request contains ${imageCount} image(s)`);

  const response = await fetch(`${config.OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`VisionLLM API error: ${response.status} - ${errorText}`);
    throw new Error(`Vision LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Debug: log the full response structure
  logger.debug('VisionLLM: Full API response:', JSON.stringify(data, null, 2).substring(0, 1000));
  
  const content = data.choices?.[0]?.message?.content || '';
  
  // Check for other possible response formats
  if (!content && data.choices?.[0]?.message) {
    logger.warn('VisionLLM: Empty content but message exists:', JSON.stringify(data.choices[0].message));
  }
  
  logger.info(`VisionLLM: Response received (${content.length} chars)`);
  
  return content;
}

/**
 * Helper to create a vision message with text and base64 image
 */
export function createVisionMessage(
  text: string,
  base64Image: string,
  mimeType: string = 'image/png'
): VisionMessage {
  return {
    role: 'user',
    content: [
      { type: 'text', text },
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`,
        },
      },
    ],
  };
}

/**
 * Helper to create a vision message with multiple images
 */
export function createMultiImageVisionMessage(
  text: string,
  images: Array<{ base64: string; mimeType?: string }>
): VisionMessage {
  const content: VisionMessage['content'] = [{ type: 'text', text }];
  
  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType || 'image/png'};base64,${img.base64}`,
      },
    });
  }
  
  return { role: 'user', content };
}
