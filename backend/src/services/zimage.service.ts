import { Client } from '@gradio/client';
import { logger } from '../utils/logger.util';
import { supabaseService } from './supabase.service';
import axios from 'axios';
import { randomUUID } from 'crypto';

// Response format from mrfakename/Z-Image-Turbo: [image, seed]
// image is a FileData object with { url, path, ... }
interface ImageResult {
  url?: string;
  path?: string;
}

const STORAGE_BUCKET = 'intel-images';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

// Image dimensions for 16:9 widescreen format
const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 896;

class ZImageService {
  // Using mrfakename's mirror of Z-Image-Turbo (more reliable)
  private readonly spaceUrl: string = 'mrfakename/Z-Image-Turbo';
  private readonly hfToken: string | undefined;

  constructor() {
    // HF_TOKEN is optional - public Spaces work without it
    // But providing one uses your own ZeroGPU quota
    this.hfToken = process.env.HF_TOKEN;
    if (!this.hfToken) {
      logger.info('HF_TOKEN not set - using public quota for Z-Image-Turbo');
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Connect to the Gradio space with retry logic
   * Handles "Space metadata could not be loaded" errors from sleeping/cold spaces
   */
  private async connectWithRetry(): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`Connecting to Z-Image-Turbo space (attempt ${attempt}/${MAX_RETRIES})...`);
        
        const client = await Client.connect(this.spaceUrl, {
          token: this.hfToken as `hf_${string}` | undefined,
        });
        
        logger.info('Successfully connected to Z-Image-Turbo space');
        return client;
        
      } catch (error: any) {
        lastError = error;
        const isSpaceMetadataError = error.message?.includes('Space metadata could not be loaded');
        const isConnectionError = error.message?.includes('ECONNREFUSED') || 
                                  error.message?.includes('ETIMEDOUT') ||
                                  error.message?.includes('fetch failed');
        
        if (isSpaceMetadataError) {
          logger.warn(`Space may be sleeping or cold starting. Attempt ${attempt}/${MAX_RETRIES} failed.`);
        } else if (isConnectionError) {
          logger.warn(`Network connection issue. Attempt ${attempt}/${MAX_RETRIES} failed.`);
        } else {
          logger.warn(`Connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
        }

        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
          logger.info(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to connect to Z-Image-Turbo after all retries');
  }

  /**
   * Download image from URL and upload to Supabase storage
   * Returns the permanent public URL from Supabase
   */
  private async uploadToStorage(tempImageUrl: string): Promise<string | null> {
    try {
      logger.info('Downloading image from temporary URL...');
      
      // Download the image as a buffer
      const response = await axios.get(tempImageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      
      const imageBuffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'image/png';
      const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
      
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `${timestamp}/${randomUUID()}.${extension}`;
      
      logger.info(`Uploading image to Supabase storage: ${filename}`);
      
      const supabase = supabaseService.getClient();
      
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filename, imageBuffer, {
          contentType,
          cacheControl: '31536000', // Cache for 1 year
          upsert: false,
        });
      
      if (error) {
        logger.error('Failed to upload to Supabase storage:', error.message);
        return null;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filename);
      
      const publicUrl = publicUrlData.publicUrl;
      logger.info('Image uploaded to Supabase storage:', publicUrl);
      
      return publicUrl;
      
    } catch (error: any) {
      logger.error('Error uploading image to storage:', error.message);
      return null;
    }
  }

  async generateImage(prompt: string): Promise<string | null> {
    try {
      // Use retry logic for connection (handles sleeping spaces)
      const client = await this.connectWithRetry();

      logger.info('Sending image generation request to Z-Image-Turbo...');
      
      // mrfakename/Z-Image-Turbo API parameters:
      // prompt, height, width, num_inference_steps, seed, randomize_seed
      const result = await client.predict('/generate_image', {
        prompt: prompt,
        height: IMAGE_HEIGHT,
        width: IMAGE_WIDTH,
        num_inference_steps: 8, // Fast turbo model (8 steps is optimal)
        seed: 0,
        randomize_seed: true,
      });

      logger.info('Z-Image-Turbo response received');
      
      // Response format: [image, seed] where image is a FileData object
      const data = result.data as [ImageResult, number];
      const imageData = data[0];
      
      if (imageData) {
        const tempImageUrl = imageData.url || imageData.path;
        
        if (tempImageUrl) {
          logger.info('Temporary image URL:', tempImageUrl);
          
          // Upload to Supabase storage for permanent URL
          const permanentUrl = await this.uploadToStorage(tempImageUrl);
          
          if (permanentUrl) {
            return permanentUrl;
          }
          
          // Fallback to temporary URL if upload fails
          logger.warn('Failed to upload to storage, using temporary URL');
          return tempImageUrl;
        }
      }

      logger.warn('Z-Image-Turbo response did not contain valid image');
      return null;

    } catch (error: any) {
      logger.error('Error generating image with Z-Image-Turbo:', error.message);
      
      // Provide more context for common errors
      if (error.message?.includes('Space metadata could not be loaded')) {
        logger.error('HINT: The Hugging Face Space may be sleeping, rate-limited, or temporarily unavailable.');
        logger.error('HINT: Consider setting HF_TOKEN env var to use your own ZeroGPU quota.');
      } else if (error.message?.includes('GPU quota')) {
        logger.error('HINT: ZeroGPU quota exhausted. Set HF_TOKEN to use your own quota.');
      }
      
      // Log more details if available
      if (error.response) {
        logger.error('Response error:', error.response);
      }
      
      return null;
    }
  }
}

export const zImageService = new ZImageService();
