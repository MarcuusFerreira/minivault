import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { IssuedApiKeyView } from '../../dto/api-key-view.js';

export interface RotateApiKeyInput {
  context: RequestContext;
  projectId: string;
  apiKeyId: string;
}
export interface RotateApiKeyPort {
  execute(input: RotateApiKeyInput): Promise<IssuedApiKeyView>;
}
export const ROTATE_API_KEY = Symbol('RotateApiKeyPort');
