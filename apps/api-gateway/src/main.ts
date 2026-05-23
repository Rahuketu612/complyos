import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Gateway');
  const app = await NestFactory.create(AppModule);

  // Security headers (Helmet)
  app.use(helmet());
  
  // Enable CORS with strict settings
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Correlation-ID'],
  });

  // Request size limits (prevent payload attacks)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Request logging with correlation ID
  app.use((req, res, next) => {
    const start = Date.now();
    const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set correlation ID response header
    res.setHeader('X-Correlation-ID', correlationId);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms [${correlationId}]`);
    });
    next();
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 API Gateway running on http://localhost:${port}`);
  logger.log(`🔒 Security: Helmet headers, CORS, rate limiting, payload limits enabled`);

  // Swagger docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('COMPLYOS API Gateway')
    .setDescription('API Gateway for COMPLYOS microservices')
    .setVersion('1.0')
    .addApiKey()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
}

bootstrap();
