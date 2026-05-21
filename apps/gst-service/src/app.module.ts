import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GstController } from './controllers/gst.controller';
import { GstService } from './services/gst.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [GstController],
  providers: [GstService, PrismaService],
  exports: [GstService],
})
export class AppModule {}