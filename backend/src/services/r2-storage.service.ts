import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { logger } from '../utils/logger.util';
import { config } from '../config/env.config';

class R2StorageService {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const accountId = config.R2_ACCOUNT_ID;
    const accessKeyId = config.R2_ACCESS_KEY_ID;
    const secretAccessKey = config.R2_SECRET_ACCESS_KEY;
    
    this.bucketName = config.R2_BUCKET_NAME || 'rogue';
    this.publicUrl = config.R2_PUBLIC_URL || '';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured. Check environment variables.');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    logger.info('R2 Storage Service initialized');
  }

  /**
   * Upload a file to R2 and return the public URL
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    try {
      logger.info(`Uploading to R2: ${key}`);

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000', // 1 year
        },
      });

      await upload.done();

      const publicUrl = `${this.publicUrl}/${key}`;
      logger.info(`File uploaded successfully: ${publicUrl}`);
      
      return publicUrl;
    } catch (error: any) {
      logger.error('R2 upload failed:', error.message);
      throw error;
    }
  }

  /**
   * List all objects in the bucket (for migration)
   */
  async listObjects(prefix?: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.client.send(command);
      return response.Contents?.map(obj => obj.Key || '') || [];
    } catch (error: any) {
      logger.error('Failed to list R2 objects:', error.message);
      throw error;
    }
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}

export const r2StorageService = new R2StorageService();
