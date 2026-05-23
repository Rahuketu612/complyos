import { Injectable, OnModuleInit } from '@nestjs/common';
import { validateEnvironment, JWT_REQUIRED_VARS } from '@complyos/shared';

@Injectable()
export class EnvironmentValidator implements OnModuleInit {
  onModuleInit() {
    const result = validateEnvironment(
      [...['DATABASE_URL'], ...JWT_REQUIRED_VARS],
      [],
    );

    if (!result.valid) {
      throw new Error(`Missing required environment variables: ${result.missing.join(', ')}`);
    }
  }
}
