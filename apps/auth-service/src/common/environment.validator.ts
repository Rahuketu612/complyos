import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

/**
 * Environment validator - runs at startup to ensure required env vars are present.
 * Fails fast on missing configuration.
 */
@Injectable()
export class EnvironmentValidator implements OnModuleInit {
  private readonly logger = new Logger('EnvironmentValidator');

  private readonly requiredVars: string[] = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  private readonly optionalWarnings: string[] = [
    'REDIS_URL',
    'SENTRY_DSN',
    'OPENAI_API_KEY',
  ];

  onModuleInit() {
    this.validate();
  }

  validate(): void {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    for (const varName of this.optionalWarnings) {
      if (!process.env[varName]) {
        warnings.push(varName);
      }
    }

    if (missing.length > 0) {
      this.logger.error(`Missing required environment variables: ${missing.join(', ')}`);
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (warnings.length > 0) {
      this.logger.warn(`Optional environment variables not set: ${warnings.join(', ')}`);
    }

    // Validate JWT_SECRET length
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.logger.warn('JWT_SECRET should be at least 32 characters for security');
    }

    // Validate DATABASE_URL format
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql')) {
      this.logger.error('DATABASE_URL must be a PostgreSQL connection string');
      throw new Error('DATABASE_URL must be a PostgreSQL connection string');
    }

    this.logger.log('Environment validation passed');
  }
}