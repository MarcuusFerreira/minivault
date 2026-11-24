import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { ApiKeyView } from '../../dto/api-key-view.js';

export interface ListApiKeysInput {
  context: RequestContext;
  projectId: string;
}
export interface ListApiKeysPort {
  execute(input: ListApiKeysInput): Promise<ApiKeyView[]>;
}
export const LIST_API_KEYS = Symbol('ListApiKeysPort');
