import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { WorkspaceService } from './services/workspace.service';
import { TaskService } from './services/task.service';
import { DocumentVaultService } from './services/document-vault.service';
import { NotificationService } from './services/notification.service';
import { NoticeService } from './services/notice.service';
import { AIProviderService } from './services/ai-provider.service';
import { AIComplianceService } from './services/ai-compliance.service';
import { CommunicationService } from './services/communication.service';
import { WorkspaceController } from './controllers/workspace.controller';
import { TaskController } from './controllers/task.controller';
import { DocumentVaultController } from './controllers/document-vault.controller';
import { NotificationController } from './controllers/notification.controller';
import { NoticeController } from './controllers/notice.controller';
import { AIController } from './controllers/ai.controller';
import { CommunicationController } from './controllers/communication.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { HealthController } from './controllers/health.controller';
import { AuditService } from './services/audit.service';
import { QueueService } from './services/queue.service';
import { SchedulerService } from './services/scheduler.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RbacGuard } from './auth/guards/rbac';
import { QueueModule } from './workers/queue.module';
import { MetricsService } from './observability/metrics.service';
import { MetricsController } from './observability/metrics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    QueueModule,
  ],
  controllers: [
    HealthController,
    WorkspaceController,
    TaskController,
    DocumentVaultController,
    NotificationController,
    NoticeController,
    AIController,
    CommunicationController,
    DashboardController,
    MetricsController,
  ],
  providers: [
    PrismaService,
    WorkspaceService,
    TaskService,
    DocumentVaultService,
    NotificationService,
    NoticeService,
    AIProviderService,
    AIComplianceService,
    CommunicationService,
    AuditService,
    QueueService,
    SchedulerService,
    MetricsService,
    JwtStrategy,
    JwtAuthGuard,
    RbacGuard,
  ],
  exports: [
    PrismaService,
    AuditService,
    QueueService,
    MetricsService,
  ],
})
export class AppModule {}
