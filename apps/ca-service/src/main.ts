import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CaServiceModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(CaServiceModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('CA Service API')
    .setDescription('CA Client Collaboration API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3006;
  await app.listen(port);
  console.log(`CA Service running on port ${port}`);
}

bootstrap();