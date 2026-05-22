import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { WorkspaceService } from './services/workspace.service';
import { TaskService } from './services/task.service';
import { DocumentVaultService } from './services/document-vault.service';
import { NotificationService } from './services/notification.service';
import { WorkspaceController } from './controllers/workspace.controller';
import { TaskController } from './controllers/task.controller';
import { DocumentVaultController } from './controllers/document-vault.controller';
import { NotificationController } from './controllers/notification.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { HealthController } from './controllers/health.controller';
import { AuditService } from './services/audit.service';

@Module({
  imports: [],
  controllers: [
    HealthController,
    WorkspaceController,
    TaskController,
    DocumentVaultController,
    NotificationController,
    DashboardController,
  ],
  providers: [
    PrismaService,
    WorkspaceService,
    TaskService,
    DocumentVaultService,
    NotificationService,
    AuditService,
  ],
  exports: [
    WorkspaceService,
    TaskService,
    DocumentVaultService,
    NotificationService,
  ],
})
export class CaServiceModule {}