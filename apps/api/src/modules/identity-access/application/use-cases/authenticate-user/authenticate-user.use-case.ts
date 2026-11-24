import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { AuthenticateUserPort } from '../../ports/input/authenticate-user.port.js';
import type { AccessTokenService } from '../../ports/output/access-token.port.js';

export class AuthenticateUserUseCase implements AuthenticateUserPort {
  constructor(
    private readonly tokens: AccessTokenService,
    private readonly users: UserRepository,
  ) {}

  async authenticate(token: string): Promise<{ userId: string } | null> {
    const userId = await this.tokens.verify(token);
    if (userId === null) return null;
    // Read on every request: a removed user loses access at once.
    const user = await this.users.findById(userId);
    return user ? { userId: user.id } : null;
  }
}
