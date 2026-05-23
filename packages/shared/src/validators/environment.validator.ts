/**
 * Shared Environment Validator
 * 
 * Fails fast in production if required secrets are missing.
 * Used by all services at startup.
 */

import { Logger } from '@nestjs/common';

export interface EnvironmentValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export const SHARED_REQUIRED_VARS = ['DATABASE_URL'];

export const SHARED_OPTIONAL_WARNINGS = [
  'REDIS_URL',
  'SENTRY_DSN',
];

export const JWT_REQUIRED_VARS = ['JWT_SECRET'];

export const AI_OPTIONAL_VARS = ['OPENAI_API_KEY', 'OLLAMA_URL'];

export function validateEnvironment(
  requiredVars: string[] = SHARED_REQUIRED_VARS,
  optionalWarnings: string[] = SHARED_OPTIONAL_WARNINGS,
  logger: Logger = new Logger('EnvironmentValidator'),
): EnvironmentValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional vars and warn if missing
  for (const varName of optionalWarnings) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  // Report missing vars
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Report warnings
  if (warnings.length > 0) {
    logger.warn(`Optional environment variables not set: ${warnings.join(', ')}`);
  }

  // Validate JWT_SECRET length if present
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      logger.warn('JWT_SECRET should be at least 32 characters for security');
    }
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      logger.error('DATABASE_URL must be a PostgreSQL connection string');
      missing.push('DATABASE_URL_INVALID_FORMAT');
    }
  }

  const valid = missing.length === 0;
  
  if (valid) {
    logger.log('Environment validation passed');
  }

  return { valid, missing, warnings };
}

/**
 * Create a NestJS module that validates environment on startup.
 * Usage: providers: [EnvironmentValidatorModule]
 */
export function createEnvironmentValidator(
  requiredVars: string[] = SHARED_REQUIRED_VARS,
  additionalVars: string[] = [],
) {
  return {
    provide: 'ENVIRONMENT_VALIDATOR',
    useFactory: () => {
      const allRequired = [...SHARED_REQUIRED_VARS, ...requiredVars, ...additionalVars];
      const result = validateEnvironment(allRequired);
      if (!result.valid) {
        throw new Error(`Environment validation failed: ${result.missing.join(', ')}`);
      }
      return result;
    },
  };
}