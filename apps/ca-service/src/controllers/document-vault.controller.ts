import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentVaultService } from '../services/document-vault.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from '../dto/document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentVaultController {
  constructor(private documentService: DocumentVaultService) {}

  @Post()
  @ApiOperation({ summary: 'Upload document metadata' })
  async createDocument(
    @Request() req: any,
    @Body() dto: CreateDocumentDto,
  ) {
    // Simplified - workspace from business or first available
    if (!dto.businessId) {
      throw new Error('businessId is required');
    }
    return this.documentService.createDocument(req.user.tenantId, req.user.id, dto.businessId, dto);
  }

  @Get('workspace/:workspaceId')
  @ApiOperation({ summary: 'List documents in workspace' })
  async listDocuments(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Query() query: DocumentQueryDto,
  ) {
    return this.documentService.listDocuments(req.user.tenantId, req.user.id, workspaceId, query);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document details' })
  async getDocument(@Request() req: any, @Param('documentId') documentId: string) {
    return this.documentService.getDocument(req.user.tenantId, req.user.id, documentId);
  }

  @Put(':documentId')
  @ApiOperation({ summary: 'Update document metadata' })
  async updateDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentService.updateDocument(req.user.tenantId, req.user.id, documentId, dto);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Request() req: any, @Param('documentId') documentId: string) {
    return this.documentService.deleteDocument(req.user.tenantId, req.user.id, documentId);
  }
}