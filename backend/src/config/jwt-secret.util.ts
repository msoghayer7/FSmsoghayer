import { ConfigService } from '@nestjs/config';

/**
 * Reads JWT_SECRET and refuses to boot without it. A silent fallback to a
 * hardcoded default would let anyone who has read this source forge tokens
 * for any user (including ADMIN) against a misconfigured deployment.
 */
export function getRequiredJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required and must not be empty.');
  }
  return secret;
}
