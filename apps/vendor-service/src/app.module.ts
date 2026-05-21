import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';

@Module({
  imports: [PrismaModule],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class AppModule {}