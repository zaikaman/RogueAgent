import request from 'supertest';
import { createServer } from '../../server';

/**
 * Health Endpoint Integration Test
 * 
 * Tests the /api/health endpoint which checks:
 * - Server responsiveness
 * - Database connectivity
 * - Service status
 */

describe('Health API Endpoint', () => {
  const app = createServer();
  jest.setTimeout(30000);

  describe('GET /api/health', () => {
    it('should return 200 and service status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      // Should return 200 or 503 depending on DB status
      expect([200, 503]).toContain(response.status);
      
      // Validate response structure
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');

      console.log('Health Check Response:', response.body);
    });

    it('should have valid timestamp format', async () => {
      const response = await request(app).get('/api/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
      
      // Timestamp should be recent (within last minute)
      const now = Date.now();
      const responseTime = timestamp.getTime();
      expect(now - responseTime).toBeLessThan(60000);
    });

    it('should report database status', async () => {
      const response = await request(app).get('/api/health');

      expect(['up', 'down', 'unknown']).toContain(response.body.services.database);
      
      if (response.body.services.database === 'up') {
        console.log('✅ Database connection healthy');
        expect(response.body.status).toBe('ok');
      } else {
        console.log('⚠️ Database connection issues detected');
      }
    });
  });
});
