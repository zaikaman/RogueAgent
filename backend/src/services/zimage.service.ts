import { Client } from '@gradio/client';
import { logger } from '../utils/logger.util';
import { supabaseService } from './supabase.service';
import axios from 'axios';
import { randomUUID } from 'crypto';

// Response format: [gallery_images[], seed_str, seed_int]
// gallery_images contains objects with { image: { url, path }, caption }
interface GalleryImage {
  image: {
    url?: string;
    path?: string;
  };
  caption?: string;
}

const STORAGE_BUCKET = 'intel-images';

class ZImageService {
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
      logger.info('Connecting to Z-Image-Turbo space...');
      
      const client = await Client.connect(this.spaceUrl, {
        token: this.hfToken as `hf_${string}` | undefined,
      });

      logger.info('Sending image generation request to Z-Image-Turbo...');
      
      const result = await client.predict('/generate', {
        prompt: prompt,
        resolution: '1600x896 ( 16:9 )', // Widescreen format for blog posts
        seed: 0,
        steps: 8, // Fast turbo model
        shift: 3.0,
        random_seed: true,
        gallery_images: [],
      });

      logger.info('Z-Image-Turbo response received');
      
      // Response is [gallery_images[], seed_str, seed_int]
      const data = result.data as [GalleryImage[], string, number];
      const galleryImages = data[0];
      
      if (galleryImages && galleryImages.length > 0) {
        const firstImage = galleryImages[0];
        const tempImageUrl = firstImage.image?.url || firstImage.image?.path;
        
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
      
      // Log more details if available
      if (error.response) {
        logger.error('Response error:', error.response);
      }
      
      return null;
    }
  }
}

export const zImageService = new ZImageService();
