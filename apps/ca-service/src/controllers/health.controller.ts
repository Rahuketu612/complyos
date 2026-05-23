import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint - public, no auth required' })
  getHealth() {
    return {
      status: 'healthy',
      service: 'ca-service',
      timestamp: new Date().toISOString(),
    };
  }
}