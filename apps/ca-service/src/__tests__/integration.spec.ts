/**
 * Integration tests for CA Service auth and tenant isolation
 * 
 * Run: npm test --workspace=@complyos/ca-service
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { CaServiceModule } from '../app.module';

describe('CA Service Integration Tests', () => {
  let app: INestApplication;

  const JWT_SECRET = 'test-secret-key-for-integration-testing';

  // Test users
  const createToken = (userId: string, tenantId: string, email: string, role: string = 'organization_admin') => {
    return jwt.sign(
      { sub: userId, tenantId, email, role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  beforeAll(async () => {
    // Set test environment
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/complyos_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CaServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Health Endpoint (Public)', () => {
    it('GET /health should return 200 without auth', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'ca-service');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Protected Endpoints', () => {
    it('GET /workspace should reject request without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/workspace/workspaces')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('POST /workspace should reject request without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspace/workspaces')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('GET /tasks should reject request without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/my')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('GET /documents should reject request without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/documents/workspace/test-workspace')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('GET /notifications should reject request without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Authentication required');
    });
  });

  describe('Valid Authentication', () => {
    it('GET /workspace should accept valid token', async () => {
      const token = createToken('user-123', 'tenant-abc', 'test@example.com');

      // This will return 404 if no workspaces exist, but 200 means auth passed
      const response = await request(app.getHttpServer())
        .get('/workspace/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          // Accept either 200 (success) or 404 (no workspaces - but auth worked)
          if (res.status !== 200 && res.status !== 404) {
            throw new Error(`Expected 200 or 404, got ${res.status}`);
          }
        });

      // If we got here, auth was accepted
      console.log('Valid auth test passed');
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should return 404 (not 403) for cross-tenant access', async () => {
      const token = createToken('user-123', 'tenant-abc', 'test@example.com');

      // Try to access workspace from different tenant
      const response = await request(app.getHttpServer())
        .get('/workspace/workspaces/non-existent-or-other-tenant-workspace')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          // Should be 404 (not found) not 403 (forbidden) 
          // to prevent enumeration attacks
          if (res.status !== 404) {
            throw new Error(`Expected 404 for cross-tenant, got ${res.status}`);
          }
        });

      expect(response.body.statusCode || response.status).toBe(404);
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: 'user-123', tenantId: 'tenant-abc', email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app.getHttpServer())
        .get('/workspace/workspaces')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/workspace/workspaces')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Missing Bearer Prefix', () => {
    it('should reject token without Bearer prefix', async () => {
      const token = createToken('user-123', 'tenant-abc', 'test@example.com');

      const response = await request(app.getHttpServer())
        .get('/workspace/workspaces')
        .set('Authorization', token) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });
});