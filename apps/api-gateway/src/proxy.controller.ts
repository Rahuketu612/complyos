import { Controller, All, Req, Res, HttpCode, Get } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Gateway')
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  health() {
    return { status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() };
  }

  @All('*')
  @HttpCode(200)
  @ApiOperation({ summary: 'Proxy all requests to downstream services' })
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path;
    const method = req.method;
    const headers = req.headers as any;
    const body = req.body;

    try {
      const result = await this.proxyService.proxy(path, method, headers, body);
      return res.json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json(error.response || { message: error.message });
    }
  }
}