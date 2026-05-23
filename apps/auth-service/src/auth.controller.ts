import { Controller, Post, Body, Get, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth/auth.service';
import { RegisterDto } from './auth/dto/register.dto';
import { LoginDto } from './auth/dto/login.dto';
import { RefreshTokenDto } from './auth/dto/refresh-token.dto';
import { EnableMfaDto } from './auth/dto/enable-mfa.dto';
import { VerifyMfaDto } from './auth/dto/verify-mfa.dto';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { Public } from './auth/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
@SkipThrottle()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return { status: 'healthy', service: 'auth', timestamp: new Date().toISOString() };
  }

  @Post('register')
  @Public()
  @HttpCode(201)
  @ApiOperation({ summary: 'Register new organization and admin user' })
  @ApiResponse({ status: 201, description: 'Registered successfully' })
  @ApiResponse({ status: 409, description: 'Organization or email already exists' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0];
    return this.authService.register(dto, ip);
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0];
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('verify-mfa')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify MFA code after login' })
  async verifyMfa(@Body() dto: VerifyMfaDto, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0];
    return this.authService.verifyMfa(dto, ip);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(
    @CurrentUser() user: any,
    @Body() dto: RefreshTokenDto,
  ) {
    await this.authService.logout(dto.refreshToken, user.id);
    return { success: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Logout from all other sessions' })
  async logoutAll(
    @CurrentUser() user: any,
    @Body('refreshToken') refreshToken?: string,
  ) {
    const count = await this.authService.logoutAll(user.id, refreshToken);
    return { success: true, revokedSessions: count };
  }

  @Post('logout-devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Logout from all devices or specific device' })
  async logoutDevices(
    @CurrentUser() user: any,
    @Body('deviceId') deviceId?: string,
  ) {
    const count = await this.authService.logoutAllDevices(user.id, deviceId);
    return { success: true, revokedSessions: count };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser() user: any) {
    const sessions = await this.authService.getActiveSessions(user.id);
    return { sessions };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.id);
  }

  @Post('enable-mfa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA for authenticated user' })
  async enableMfa(@CurrentUser() user: any) {
    return this.authService.enableMfa(user.id);
  }

  @Post('confirm-mfa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm MFA setup with verification code' })
  async confirmMfa(@CurrentUser() user: any, @Body() dto: EnableMfaDto) {
    await this.authService.confirmMfa(user.id, dto.code);
    return { success: true };
  }

  @Post('disable-mfa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable MFA' })
  async disableMfa(@CurrentUser() user: any) {
    await this.authService.disableMfa(user.id);
    return { success: true };
  }
}