import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, RequireRoles } from '../auth/guards/rbac';
import { GlobalRole } from '@complyos/shared';
import { TaskService } from '../services/task.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard, RbacGuard)
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Get('workspace/:workspaceId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'List tasks for workspace' })
  async listTasks(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
  ) {
    return this.taskService.listTasks(req.user.tenantId, workspaceId, status);
  }

  @Get(':taskId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'Get task details' })
  async getTask(@Request() req: any, @Param('taskId') taskId: string) {
    return this.taskService.getTask(req.user.tenantId, req.user.id, taskId);
  }

  @Put(':taskId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'Update task' })
  async updateTask(
    @Request() req: any,
    @Param('taskId') taskId: string,
    @Body() body: { status?: string; title?: string },
  ) {
    return this.taskService.updateTask(req.user.tenantId, req.user.id, taskId, body);
  }
}
