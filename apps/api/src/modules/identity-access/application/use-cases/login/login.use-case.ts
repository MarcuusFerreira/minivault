import { ApplicationError } from '../../../../../shared/application/application-error.js';
import { InvalidEmailError } from '../../../domain/exceptions/identity.errors.js';
import type { User } from '../../../domain/entities/user.entity.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { toUserView } from '../../dto/user-view.js';
import type { LoginCommand, LoginPort, LoginResult } from '../../ports/input/login.port.js';
import type { AccessTokenService } from '../../ports/output/access-token.port.js';
import type { PasswordHasher } from '../../ports/output/password-hasher.port.js';

export class LoginUseCase implements LoginPort {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AccessTokenService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.find(command.email);
    // Verified before looking at the user, so every failure takes the same time.
    const matches = await this.hasher.verify(command.password, user?.passwordHash ?? null);
    if (!user || !matches) {
      throw new ApplicationError('INVALID_CREDENTIALS', 'unauthenticated', 'Email or password is incorrect.');
    }
    const { token, expiresIn } = await this.tokens.issue(user.id);
    return { accessToken: token, expiresIn, user: toUserView(user) };
  }

  private async find(rawEmail: string): Promise<User | null> {
    try {
      return await this.users.findByEmail(Email.create(rawEmail));
    } catch (error) {
      if (error instanceof InvalidEmailError) return null;
      throw error;
    }
  }
}
