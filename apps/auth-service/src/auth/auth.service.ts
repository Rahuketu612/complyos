import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { v4 as uuidv4 } from 'uuid';

interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto, ip?: string): Promise<{ tenant: any; user: any; tokens: TokenPair }> {
    // Check if tenant exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });

    if (existingTenant) {
      throw new ConflictException('Organization already exists');
    }

    // Check if user email exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        tenant: { slug: dto.slug.toLowerCase() },
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered in this organization');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create tenant and user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          id: uuidv4(),
          name: dto.organizationName,
          slug: dto.slug.toLowerCase(),
          address: dto.address,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
        },
      });

      const user = await tx.user.create({
        data: {
          id: uuidv4(),
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'organization_admin',
          status: 'active',
        },
      });

      return { tenant, user };
    });

    // Generate tokens
    const tokens = await this.generateTokens(result.user, result.tenant.id);

    // Create session
    await this.createSession(result.user.id, result.tenant.id, tokens.refreshToken, ip);

    // Log audit
    await this.logAudit(result.tenant.id, result.user.id, 'register', 'User', result.user.id, 
      { email: dto.email }, { ip });

    return { tenant: result.tenant, user: this.sanitizeUser(result.user), tokens };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<{ user: any; tenant: any; tokens: TokenPair; requiresMfa: boolean }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check MFA
    if (user.mfaEnabled && !dto.mfaCode) {
      return {
        user: this.sanitizeUser(user),
        tenant: user.tenant,
        tokens: null as any,
        requiresMfa: true,
      };
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, user.tenantId);

    // Create session
    await this.createSession(user.id, user.tenantId, tokens.refreshToken, ip, userAgent);

    // Update login stats
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        loginCount: { increment: 1 },
      },
    });

    // Log audit
    await this.logAudit(user.tenantId, user.id, 'login', 'User', user.id, {}, { ip, userAgent });

    return {
      user: this.sanitizeUser(user),
      tenant: user.tenant,
      tokens,
      requiresMfa: false,
    };
  }

  async verifyMfa(dto: VerifyMfaDto, ip?: string): Promise<{ user: any; tenant: any; tokens: TokenPair }> {
    if (!dto.refreshToken) {
      throw new BadRequestException('Refresh token required');
    }
    const payload = this.jwtService.verify(dto.refreshToken, {
      secret: process.env.JWT_SECRET,
    }) as JwtPayload;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('Invalid session');
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: dto.mfaCode,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const tokens = await this.generateTokens(user, user.tenantId);
    await this.createSession(user.id, user.tenantId, tokens.refreshToken, ip);

    return {
      user: this.sanitizeUser(user),
      tenant: user.tenant,
      tokens,
    };
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_SECRET,
      }) as JwtPayload;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Revoke old session
      await this.prisma.session.updateMany({
        where: { refreshToken: dto.refreshToken },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      return this.generateTokens(user, user.tenantId);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshToken, userId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async enableMfa(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = speakeasy.generate({
      name: `COMPLYOS (${user.email})`,
      issuer: 'COMPLYOS',
    });

    const qrCode = await QRCode.toDataURL(
      `otpauth://totp/${encodeURIComponent('COMPLYOS')}:${encodeURIComponent(user.email)}?secret=${secret.base32}&issuer=${encodeURIComponent('COMPLYOS')}`
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    return { secret: secret.base32, qrCode };
  }

  async confirmMfa(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA not set up');
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
  }

  async disableMfa(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
  }

  async validateJwt(payload: JwtPayload): Promise<any | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    return user;
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  private async generateTokens(user: any, tenantId: string): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpirySeconds(this.ACCESS_TOKEN_EXPIRY),
    };
  }

  private async createSession(
    userId: string,
    tenantId: string,
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const tokenExpiry = new Date();
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + this.getExpirySeconds(this.ACCESS_TOKEN_EXPIRY) / 60);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + this.getExpiryDays(this.REFRESH_TOKEN_EXPIRY));

    await this.prisma.session.create({
      data: {
        userId,
        tenantId,
        accessToken: refreshToken.replace(/\./g, '_'), // Use as temp token
        refreshToken,
        tokenExpiry,
        refreshTokenExpiry,
        ipAddress: ip,
        userAgent,
      },
    });
  }

  private sanitizeUser(user: any): any {
    const { passwordHash, mfaSecret, ...sanitized } = user;
    return sanitized;
  }

  private async logAudit(
    tenantId: string,
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    values: any,
    meta?: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        newValues: values,
        ...meta,
      },
    }).catch(() => {}); // Non-blocking
  }

  private getExpirySeconds(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([mhd])/);
    if (!match) return 900;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  private getExpiryDays(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([mhd])/);
    if (!match) return 7;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'd': return value;
      case 'm': return value * 30;
      case 'h': return Math.ceil(value / 24);
      default: return 7;
    }
  }
}