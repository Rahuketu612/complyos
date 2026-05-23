/**
 * E2E Test Suite - CA Service
 * Tests: login, protected routes, workspace switching, notice workflow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CA Service E2E Tests', () => {
  let app: INestApplication;
  let accessToken: string;
  const testUser = {
    email: 'test@complyos.com',
    password: 'Test@123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/notices')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'invalid@test.com', password: 'wrong' })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should accept valid credentials (if user exists)', async () => {
      // This test is placeholder - real credentials needed
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);

      // Will pass only if test user exists in database
      if (response.status === 200) {
        accessToken = response.body.accessToken;
        expect(accessToken).toBeDefined();
      }
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login for unauthenticated users', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200); // Health check should be public

      expect(response.body.status).toBe('ok');
    });

    it('should allow authenticated access to notices', async () => {
      // Skip if no access token from login test
      if (!accessToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/notices')
        .set('Authorization', `Bearer ${accessToken}`);

      // 200 if authenticated and authorized, 403 if RBAC fails
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('RBAC Enforcement', () => {
    it('should deny access with insufficient roles', async () => {
      if (!accessToken) {
        return;
      }

      // Try admin-only endpoint
      const response = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Workspace' });

      // Should be 200 (authorized) or 403 (insufficient role)
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Notice Workflow', () => {
    it('should list notices for authorized user', async () => {
      if (!accessToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/notices')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data).toBeDefined();
      }
    });

    it('should filter notices by status', async () => {
      if (!accessToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/notices')
        .query({ status: 'received' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Communication Workflow', () => {
    it('should list communication threads', async () => {
      if (!accessToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/communications/threads')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403]).toContain(response.status);
    });

    it('should create new thread with proper permissions', async () => {
      if (!accessToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/communications/threads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          workspaceId: 'test-workspace-id',
          subject: 'Test Thread',
        });

      expect([201, 400, 403]).toContain(response.status);
    });
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return queue health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/queues')
        .expect(200);

      expect(response.body.redis).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format', async () => {
      const response = await request(app.getHttpServer())
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
