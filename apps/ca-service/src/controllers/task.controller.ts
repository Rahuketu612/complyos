import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskService } from '../services/task.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from '../dto/task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async createTask(
    @Request() req: any,
    @Body() dto: CreateTaskDto,
  ) {
    // Simplified - workspace from business or first available
    if (!dto.linkedBusinessId) {
      throw new Error('linkedBusinessId is required');
    }
    return this.taskService.createTask(req.user.tenantId, req.user.id, dto.linkedBusinessId, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my assigned tasks' })
  async getMyTasks(@Request() req: any) {
    return this.taskService.getMyTasks(req.user.tenantId, req.user.id);
  }

  @Get('workspace/:workspaceId')
  @ApiOperation({ summary: 'List tasks in workspace' })
  async listTasks(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Query() query: TaskQueryDto,
  ) {
    return this.taskService.listTasks(req.user.tenantId, req.user.id, workspaceId, {
      ...query,
      dueBefore: query.dueBefore ? new Date(query.dueBefore) : undefined,
      dueAfter: query.dueAfter ? new Date(query.dueAfter) : undefined,
    });
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get task details' })
  async getTask(@Request() req: any, @Param('taskId') taskId: string) {
    return this.taskService.getTask(req.user.tenantId, req.user.id, taskId);
  }

  @Put(':taskId')
  @ApiOperation({ summary: 'Update task' })
  async updateTask(
    @Request() req: any,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(req.user.tenantId, req.user.id, taskId, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete task' })
  async deleteTask(@Request() req: any, @Param('taskId') taskId: string) {
    return this.taskService.deleteTask(req.user.tenantId, req.user.id, taskId);
  }
}