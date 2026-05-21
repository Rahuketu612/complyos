import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api');
  app.enableCors();
  
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  
  const config = new DocumentBuilder()
    .setTitle('COMPLYOS Vendor API')
    .setDescription('Vendor Intelligence API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`🚀 Vendor service running on port ${port}`);
}
bootstrap();