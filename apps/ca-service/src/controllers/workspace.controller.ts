import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkspaceService } from '../services/workspace.service';
import { CreateFirmDto, CreateWorkspaceDto, AddMemberDto } from '../dto/workspace.dto';

@ApiTags('Workspace')
@ApiBearerAuth()
@Controller('workspace')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post('firms')
  @ApiOperation({ summary: 'Create a new firm' })
  async createFirm(@Request() req: any, @Body() dto: CreateFirmDto) {
    return this.workspaceService.createFirm(req.user.tenantId, req.user.id, dto);
  }

  @Get('firms')
  @ApiOperation({ summary: 'List all firms' })
  async listFirms(@Request() req: any) {
    return this.workspaceService.listFirms(req.user.tenantId);
  }

  @Get('firms/:firmId')
  @ApiOperation({ summary: 'Get firm details' })
  async getFirm(@Request() req: any, @Param('firmId') firmId: string) {
    return this.workspaceService.getFirm(req.user.tenantId, firmId);
  }

  @Post('workspaces')
  @ApiOperation({ summary: 'Create a new workspace' })
  async createWorkspace(
    @Request() req: any,
    @Body() dto: CreateWorkspaceDto,
  ) {
    if (!dto.businessId) {
      throw new Error('businessId is required to create workspace');
    }
    return this.workspaceService.createWorkspace(req.user.tenantId, req.user.id, dto.businessId, dto);
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List my workspaces' })
  async listWorkspaces(@Request() req: any) {
    return this.workspaceService.listWorkspaces(req.user.tenantId, req.user.id);
  }

  @Get('workspaces/:workspaceId')
  @ApiOperation({ summary: 'Get workspace details' })
  async getWorkspace(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspaceService.getWorkspace(req.user.tenantId, workspaceId, req.user.id);
  }

  @Post('workspaces/:workspaceId/members')
  @ApiOperation({ summary: 'Add member to workspace' })
  async addMember(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaceService.addMember(req.user.tenantId, req.user.id, workspaceId, dto);
  }
}