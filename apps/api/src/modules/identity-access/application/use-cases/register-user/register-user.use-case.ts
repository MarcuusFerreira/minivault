import type { Clock } from '../../../../../shared/application/clock.js';
import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import { User } from '../../../domain/entities/user.entity.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { PlainPassword } from '../../../domain/value-objects/plain-password.vo.js';
import { toUserView, type UserView } from '../../dto/user-view.js';
import type { RegisterUserCommand, RegisterUserPort } from '../../ports/input/register-user.port.js';
import type { PasswordHasher } from '../../ports/output/password-hasher.port.js';

export class RegisterUserUseCase implements RegisterUserPort {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterUserCommand): Promise<UserView> {
    const email = Email.create(command.email);
    const password = PlainPassword.create(command.password);
    const user = User.register({
      id: this.ids.next(),
      name: command.name,
      email,
      passwordHash: await this.hasher.hash(password.reveal()),
      now: this.clock.now(),
    });
    await this.users.add(user);
    return toUserView(user);
  }
}
