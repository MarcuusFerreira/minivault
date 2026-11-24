import type { RequestContext } from '../../../../../shared/domain/principal.js';

export interface RevokeApiKeyInput {
  context: RequestContext;
  projectId: string;
  apiKeyId: string;
}
export interface RevokeApiKeyPort {
  execute(input: RevokeApiKeyInput): Promise<void>;
}
export const REVOKE_API_KEY = Symbol('RevokeApiKeyPort');
