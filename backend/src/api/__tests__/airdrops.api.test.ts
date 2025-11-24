import request from 'supertest';
import { createServer } from '../../server';

/**
 * Airdrops API Integration Test
 * 
 * Tests the /api/airdrops endpoint which:
 * - Returns airdrop opportunities
 * - Supports pagination
 * - Returns properly formatted data
 */

describe('Airdrops API Endpoint', () => {
  const app = createServer();
  jest.setTimeout(30000);

  describe('GET /api/airdrops', () => {
    it('should return airdrops with pagination', async () => {
      const response = await request(app)
        .get('/api/airdrops')
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('airdrops');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.airdrops)).toBe(true);

      // Validate pagination
      const { pagination } = response.body;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('pages');

      console.log(`Found ${response.body.airdrops.length} airdrops`);
      console.log('Pagination:', pagination);
    });

    it('should use default pagination values', async () => {
      const response = await request(app)
        .get('/api/airdrops')
        .expect(200);

      // Default: page=1, limit=10
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.airdrops.length).toBeLessThanOrEqual(10);
    });

    it('should respect custom page and limit', async () => {
      const response = await request(app)
        .get('/api/airdrops?page=2&limit=5')
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.airdrops.length).toBeLessThanOrEqual(5);
    });

    it('should calculate total pages correctly', async () => {
      const response = await request(app)
        .get('/api/airdrops?limit=5')
        .expect(200);

      const { total, limit, pages } = response.body.pagination;
      const expectedPages = Math.ceil((total || 0) / limit);
      
      expect(pages).toBe(expectedPages);
    });

    it('should return airdrop with required fields', async () => {
      const response = await request(app)
        .get('/api/airdrops?limit=1')
        .expect(200);

      if (response.body.airdrops.length > 0) {
        const airdrop = response.body.airdrops[0];
        
        // Common fields for airdrops
        expect(airdrop).toHaveProperty('id');
        expect(airdrop).toHaveProperty('created_at');
        
        console.log('Airdrop sample:', {
          id: airdrop.id,
          created: airdrop.created_at,
          keys: Object.keys(airdrop)
        });
      } else {
        console.log('No airdrops in database yet');
      }
    });

    it('should handle large page numbers gracefully', async () => {
      const response = await request(app)
        .get('/api/airdrops?page=999999')
        .expect(200);

      // Should return empty array for pages beyond data
      expect(Array.isArray(response.body.airdrops)).toBe(true);
    });

    it('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/airdrops?page=invalid&limit=notanumber')
        .expect(200);

      // Should fall back to defaults
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });
});
