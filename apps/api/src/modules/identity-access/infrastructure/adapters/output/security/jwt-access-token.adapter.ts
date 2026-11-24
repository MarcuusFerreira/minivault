import { JwtService } from '@nestjs/jwt';
import type { AccessTokenService } from '../../../../application/ports/output/access-token.port.js';

const ISSUER = 'minivault';
const AUDIENCE = 'minivault-api';

export class JwtAccessTokenService implements AccessTokenService {
  private readonly jwt = new JwtService();

  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number,
  ) {}

  async issue(userId: string): Promise<{ token: string; expiresIn: number }> {
    const token = await this.jwt.signAsync(
      {},
      {
        secret: this.secret,
        algorithm: 'HS256',
        issuer: ISSUER,
        audience: AUDIENCE,
        subject: userId,
        expiresIn: this.ttlSeconds,
      },
    );
    return { token, expiresIn: this.ttlSeconds };
  }

  async verify(token: string): Promise<string | null> {
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: unknown }>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return typeof claims.sub === 'string' ? claims.sub : null;
    } catch {
      return null;
    }
  }
}
