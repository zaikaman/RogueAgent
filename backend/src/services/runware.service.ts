import axios from 'axios';
import { logger } from '../utils/logger.util';
import { randomUUID } from 'crypto';

interface RunwareImageRequest {
  positivePrompt: string;
  model: string;
  width: number;
  height: number;
  steps?: number;
  cfgScale?: number;
}

interface RunwareResponse {
  data: Array<{
    taskType: string;
    taskUUID: string;
    imageUUID?: string;
    imageURL?: string;
    error?: string;
  }>;
  errors?: Array<{
    message: string;
  }>;
}

class RunwareService {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.runware.ai/v1';
  private readonly defaultModel: string = 'civitai:497255@552771';

  constructor() {
    this.apiKey = process.env.RUNWARE_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('RUNWARE_API_KEY is not set');
    }
  }

  async generateImage(prompt: string): Promise<string | null> {
    if (!this.apiKey) {
      logger.error('Cannot generate image: RUNWARE_API_KEY is missing');
      return null;
    }

    try {
      const requestPayload = [
        {
          taskType: 'imageInference',
          taskUUID: randomUUID(),
          model: this.defaultModel,
          positivePrompt: prompt,
          width: 1920,
          height: 1080,
          steps: 30,
          outputType: 'URL',
          outputFormat: 'JPG',
        },
      ];

      logger.info('Sending image generation request to Runware...');
      
      const response = await axios.post<RunwareResponse>(
        this.baseUrl,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.data.errors) {
        logger.error('Runware API returned errors:', response.data.errors);
        return null;
      }

      const result = response.data.data[0];
      if (result.error) {
        logger.error('Runware task failed:', result.error);
        return null;
      }

      if (result.imageURL) {
        logger.info('Image generated successfully:', result.imageURL);
        return result.imageURL;
      }

      logger.warn('Runware response did not contain imageURL');
      return null;

    } catch (error: any) {
      logger.error('Error generating image with Runware:', error.response?.data || error.message);
      return null;
    }
  }
}

export const runwareService = new RunwareService();
