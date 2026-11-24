export interface AccessTokenService {
  issue(userId: string): Promise<{ token: string; expiresIn: number }>;
  /** Returns the user id, or null when the token is not acceptable. */
  verify(token: string): Promise<string | null>;
}
export const ACCESS_TOKEN_SERVICE = Symbol('AccessTokenService');
