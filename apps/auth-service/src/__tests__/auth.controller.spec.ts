import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

// Jest globals are defined via @types/jest

describe('Auth Controller Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@complyos.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('sessionId');

      authToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      sessionId = response.body.sessionId;
    });

    it('should include correlation ID in response headers', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@complyos.com',
          password: 'password123',
        });

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@complyos.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject missing fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should rotate refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('POST /auth/logout', () => {
    it('should invalidate current session on logout', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should invalidate all user sessions on logout-all', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('Protected endpoints', () => {
    it('should reject requests with revoked token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@complyos.com',
          password: 'password123',
        });

      const token = loginResponse.body.accessToken;
      const sid = loginResponse.body.sessionId;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId: sid });

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should reject requests without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('Correlation ID in error responses', () => {
    it('should include correlation ID in error responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('x-correlation-id', 'test-correlation-id');

      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
    });
  });
});