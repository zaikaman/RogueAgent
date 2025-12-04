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
  
  // Log the text prompts being sent (not the base64 images)
  messages.forEach((msg, i) => {
    if (Array.isArray(msg.content)) {
      const textParts = msg.content.filter(c => c.type === 'text').map(c => (c as { type: 'text'; text: string }).text);
      if (textParts.length > 0) {
        const promptPreview = textParts.join('\n').substring(0, 500);
        logger.info(`VisionLLM: Message ${i} prompt: ${promptPreview}${textParts.join('\n').length > 500 ? '...' : ''}`);
      }
    }
  });

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
  
  // Log the API response metadata
  logger.info('VisionLLM: API response received', {
    model: data.model,
    id: data.id,
    usage: data.usage,
    finish_reason: data.choices?.[0]?.finish_reason,
  });
  
  const content = data.choices?.[0]?.message?.content || '';
  
  // Check for other possible response formats
  if (!content && data.choices?.[0]?.message) {
    logger.warn('VisionLLM: Empty content but message exists:', JSON.stringify(data.choices[0].message));
  }
  
  // Log the full response content (truncated for very long responses)
  const contentPreview = content.length > 2000 ? content.substring(0, 2000) + '...[truncated]' : content;
  logger.info(`VisionLLM: Response content (${content.length} chars):\n${contentPreview}`);
  
  // Log first 500 chars separately for easier viewing in logs
  logger.info(`VisionLLM: Response preview: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);
  
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
