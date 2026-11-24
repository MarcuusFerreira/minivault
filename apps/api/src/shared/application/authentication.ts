import type { ApiKeyPrincipal } from '../domain/principal.js';

export interface UserAuthenticator {
  authenticate(token: string): Promise<{ userId: string } | null>;
}
export const USER_AUTHENTICATOR = Symbol('UserAuthenticator');

export interface ApiKeyAuthenticator {
  authenticate(key: string): Promise<ApiKeyPrincipal | null>;
}
export const API_KEY_AUTHENTICATOR = Symbol('ApiKeyAuthenticator');
