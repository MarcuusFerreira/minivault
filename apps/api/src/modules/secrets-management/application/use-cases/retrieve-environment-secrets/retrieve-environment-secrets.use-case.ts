import { ApplicationError } from '../../../../../shared/application/application-error.js';
import type { RevealedSecret } from '../../dto/secret-view.js';
import type {
  RetrieveEnvironmentSecretsInput,
  RetrieveEnvironmentSecretsPort,
} from '../../ports/input/retrieve-environment-secrets.port.js';
import type { RetrieveSecretsPort } from '../../ports/input/retrieve-secrets.port.js';
import type { EnvironmentDirectory } from '../../ports/output/environment-directory.port.js';
import { environmentNotFound } from '../../secret-errors.js';

export class RetrieveEnvironmentSecretsUseCase implements RetrieveEnvironmentSecretsPort {
  constructor(
    private readonly environments: EnvironmentDirectory,
    private readonly retrieveSecrets: RetrieveSecretsPort,
  ) {}

  async execute({ context, environmentName }: RetrieveEnvironmentSecretsInput): Promise<RevealedSecret[]> {
    const { principal } = context;
    if (principal.kind !== 'apiKey') {
      throw new ApplicationError('API_KEY_REQUIRED', 'forbidden', 'This endpoint requires an API key.');
    }
    const { projectId } = principal;
    const environment = await this.environments.byName(projectId, environmentName);
    if (!environment) throw environmentNotFound();
    return this.retrieveSecrets.execute({ context, projectId, environmentId: environment.id, keys: null });
  }
}
