import { Client } from '@gradio/client';
import { logger } from '../utils/logger.util';
import { r2StorageService } from './r2-storage.service';
import axios from 'axios';
import { randomUUID } from 'crypto';

// Response format from Tongyi-MAI/Z-Image-Turbo: [gallery_images, seed_used, seed]
// (Some spaces may return the older 2-element format: [gallery_images, seed_used])
// gallery_images is an array of objects with { image: FileData, caption: null }
interface ImageResult {
  url?: string;
  path?: string;
}

interface GalleryItem {
  image: ImageResult;
  caption: string | null;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

// Default resolution: 2048x1152 (16:9)
// Z-Image-Turbo supports multiple resolutions via dropdown
const DEFAULT_RESOLUTION = '2048x1152 ( 16:9 )';

class ZImageService {
  // Using Tongyi-MAI/Z-Image-Turbo
  private readonly spaceUrl: string = 'Tongyi-MAI/Z-Image-Turbo';
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
   * Download image from URL and upload to R2 storage
   * Returns the permanent public URL from R2
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
      
      logger.info(`Uploading image to R2 storage: ${filename}`);
      
      // Upload to R2
      const publicUrl = await r2StorageService.uploadFile(
        imageBuffer,
        filename,
        contentType
      );
      
      logger.info('Image uploaded to R2 storage:', publicUrl);
      
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
      
      // Tongyi-MAI/Z-Image-Turbo API parameters for /generate endpoint:
      // prompt (required), resolution, seed, steps, shift, random_seed, gallery_images
      const result = await client.predict('/generate', {
        prompt: prompt,
        resolution: DEFAULT_RESOLUTION, // "1024x1024 ( 1:1 )"
        seed: -1, // -1 with random_seed=true for random
        steps: 8, // Inference steps (default: 8)
        shift: 3, // Time shift parameter (default: 3)
        random_seed: true, // Randomize seed
        gallery_images: [], // Previous gallery images (empty for new generation)
      });

      logger.info('Z-Image-Turbo response received');
      
      // Response format (documented): [gallery_images, seed_used, seed]
      // Back-compat: some variants return [gallery_images, seed_used]
      const data = result.data as unknown;

      const galleryImages = Array.isArray(data) ? (data[0] as GalleryItem[] | undefined) : undefined;
      const seedUsed = Array.isArray(data) ? (data[1] as string | undefined) : undefined;
      const seedEcho = Array.isArray(data) ? data[2] : undefined;

      if (seedUsed !== undefined) {
        logger.info(`Seed used: ${seedUsed}`);
      }
      if (seedEcho !== undefined) {
        logger.info(`Seed returned: ${String(seedEcho)}`);
      }
      
      if (galleryImages && galleryImages.length > 0) {
        const galleryItem = galleryImages[0]; // Get first item from gallery
        const imageData = galleryItem.image; // Extract the image FileData
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
