import type { Grant, RequestContext } from '../../../../../shared/domain/principal.js';
import type { IssuedApiKeyView } from '../../dto/api-key-view.js';

export interface GenerateApiKeyInput {
  context: RequestContext;
  projectId: string;
  name: string;
  expiresAt: Date | null;
  grants: readonly Grant[];
}
export interface GenerateApiKeyPort {
  execute(input: GenerateApiKeyInput): Promise<IssuedApiKeyView>;
}
export const GENERATE_API_KEY = Symbol('GenerateApiKeyPort');
