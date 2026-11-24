import { ApplicationError } from '../../../../../shared/application/application-error.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { toUserView, type UserView } from '../../dto/user-view.js';
import type { GetCurrentUserPort } from '../../ports/input/get-current-user.port.js';

export class GetCurrentUserUseCase implements GetCurrentUserPort {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<UserView> {
    const user = await this.users.findById(userId);
    if (!user) throw new ApplicationError('UNAUTHENTICATED', 'unauthenticated', 'Authentication is required.');
    return toUserView(user);
  }
}
