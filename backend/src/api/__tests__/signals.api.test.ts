import request from 'supertest';
import { createServer } from '../../server';

/**
 * Signals API Integration Test
 * 
 * Tests the /api/signals endpoint which:
 * - Returns trading signal history
 * - Handles pagination
 * - Filters by user tier (Gold/Diamond/Silver/Free)
 * - Respects time-based access control
 */

describe('Signals API Endpoint', () => {
  const app = createServer();
  jest.setTimeout(30000);

  describe('GET /api/signals', () => {
    it('should return signals with pagination', async () => {
      const response = await request(app)
        .get('/api/signals')
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Validate pagination metadata
      const { pagination } = response.body;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('pages');

      console.log(`Found ${response.body.data.length} signals`);
      console.log('Pagination:', pagination);
    });

    it('should respect page parameter', async () => {
      const page1 = await request(app)
        .get('/api/signals?page=1&limit=5')
        .expect(200);

      const page2 = await request(app)
        .get('/api/signals?page=2&limit=5')
        .expect(200);

      expect(page1.body.pagination.page).toBe(1);
      expect(page2.body.pagination.page).toBe(2);

      // If both pages have data, they should be different
      if (page1.body.data.length > 0 && page2.body.data.length > 0) {
        expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/signals?limit=3')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.pagination.limit).toBe(3);
    });

    it('should return signals with required fields', async () => {
      const response = await request(app)
        .get('/api/signals?limit=1')
        .expect(200);

      if (response.body.data.length > 0) {
        const signal = response.body.data[0];
        
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('created_at');
        expect(signal).toHaveProperty('content');
        expect(signal).toHaveProperty('public_posted_at');

        // Validate content structure
        const { content } = signal;
        expect(content).toHaveProperty('token');
        expect(content.token).toHaveProperty('symbol');
        expect(content.token).toHaveProperty('name');

        console.log('Signal sample:', {
          id: signal.id,
          token: content.token.symbol,
          created: signal.created_at
        });
      } else {
        console.log('No signals in database yet');
      }
    });

    it('should filter by wallet address (tier-based access)', async () => {
      // Free tier - 60 min delay
      const freeUser = await request(app)
        .get('/api/signals?address=0x0000000000000000000000000000000000000000')
        .expect(200);

      expect(freeUser.body).toHaveProperty('data');
      
      // All signals should be older than 60 minutes
      const sixtyMinsAgo = Date.now() - (60 * 60 * 1000);
      freeUser.body.data.forEach((signal: any) => {
        const signalTime = new Date(signal.created_at).getTime();
        expect(signalTime).toBeLessThan(sixtyMinsAgo);
      });

      console.log(`Free tier access: ${freeUser.body.data.length} signals (60min+ old)`);
    });

    it('should handle invalid pagination gracefully', async () => {
      const response = await request(app)
        .get('/api/signals?page=-1&limit=0')
        .expect(200);

      // Should default to reasonable values
      expect(response.body.pagination.page).toBeGreaterThan(0);
      expect(response.body.pagination.limit).toBeGreaterThan(0);
    });

    it('should return signals in descending order (newest first)', async () => {
      const response = await request(app)
        .get('/api/signals?limit=5')
        .expect(200);

      if (response.body.data.length > 1) {
        const timestamps = response.body.data.map((s: any) => 
          new Date(s.created_at).getTime()
        );

        // Check if sorted descending
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
        }
      }
    });
  });
});
