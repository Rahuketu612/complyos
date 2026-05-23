import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, RequireRoles } from '../auth/guards/rbac';
import { GlobalRole } from '@complyos/shared';
import { DocumentVaultService } from '../services/document-vault.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DocumentVaultController {
  constructor(private documentVaultService: DocumentVaultService) {}

  @Get('workspace/:workspaceId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'List documents for workspace' })
  async listDocuments(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Query('category') category?: string,
  ) {
    return this.documentVaultService.listDocuments(req.user.tenantId, workspaceId, category);
  }

  @Get(':documentId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER, GlobalRole.VIEWER)
  @ApiOperation({ summary: 'Get document metadata' })
  async getDocument(@Request() req: any, @Param('documentId') documentId: string) {
    return this.documentVaultService.getDocument(req.user.tenantId, req.user.id, documentId);
  }

  @Post()
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF, GlobalRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Upload document' })
  async uploadDocument(
    @Request() req: any,
    @Body() body: { workspaceId: string; fileName: string; originalName: string; fileType: string; mimeType: string; size: number; category: string },
  ) {
    return this.documentVaultService.createDocument(req.user.tenantId, req.user.id, body.workspaceId, body);
  }

  @Delete(':documentId')
  @RequireRoles(GlobalRole.CA_ADMIN, GlobalRole.CA_STAFF)
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Request() req: any, @Param('documentId') documentId: string) {
    return this.documentVaultService.deleteDocument(req.user.tenantId, req.user.id, documentId);
  }
}
