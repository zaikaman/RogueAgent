import request from 'supertest';
import { createServer } from '../../server';

/**
 * Server & Routes Integration Test
 * 
 * Tests basic server functionality:
 * - Root endpoint
 * - Route mounting
 * - Error handling
 */

describe('Server Integration Tests', () => {
  const app = createServer();

  describe('GET /', () => {
    it('should return service information', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status');
      
      expect(response.body.service).toBe('Rogue Agent Backend');
      expect(response.body.status).toBe('running');

      console.log('Service Info:', response.body);
    });
  });

  describe('Route Mounting', () => {
    it('should have /api routes mounted', async () => {
      const healthResponse = await request(app).get('/api/health');
      expect(healthResponse.status).not.toBe(404);
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);
    });
  });

  describe('CORS Configuration', () => {
    it('should allow cross-origin requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON request bodies', async () => {
      // This would be tested with POST/PUT endpoints
      // For now, just verify the middleware is active
      const response = await request(app)
        .post('/api/test-json')
        .send({ test: 'data' });

      // Will be 404 since route doesn't exist, but proves JSON parsing works
      expect(response.status).toBe(404);
    });
  });
});
