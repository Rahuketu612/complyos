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
    .setTitle('COMPLYOS GST API')
    .setDescription('GST Intelligence API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`🚀 GST service running on port ${port}`);
}
bootstrap();