import { SetMetadata } from '@nestjs/common';

export const API_KEY_ACCESS = 'minivault:api-key-access';
export type ApiKeyAccess = 'allowed' | 'only';
/** Opens a route to API keys. Without it, API keys are refused. */
export const AllowApiKey = (access: ApiKeyAccess = 'allowed') => SetMetadata(API_KEY_ACCESS, access);
