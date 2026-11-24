import type { Actor } from '../../../../../shared/domain/principal.js';

export interface ProvisionDefaultEnvironmentsPort {
  execute(input: { projectId: string; actor: Actor }): Promise<void>;
}
export const PROVISION_DEFAULT_ENVIRONMENTS = Symbol('ProvisionDefaultEnvironmentsPort');
