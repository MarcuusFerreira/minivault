import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { RevealedSecret } from '../../dto/secret-view.js';

export interface RetrieveEnvironmentSecretsInput {
  context: RequestContext;
  environmentName: string;
}
/** For applications: the API key itself says which project is meant. */
export interface RetrieveEnvironmentSecretsPort {
  execute(input: RetrieveEnvironmentSecretsInput): Promise<RevealedSecret[]>;
}
export const RETRIEVE_ENVIRONMENT_SECRETS = Symbol('RetrieveEnvironmentSecretsPort');
