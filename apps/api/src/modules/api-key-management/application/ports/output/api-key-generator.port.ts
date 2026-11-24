export interface ApiKeyGenerator {
  generate(): { plaintext: string; hash: string; prefix: string };
  /** Null when the text cannot be an API key. */
  hash(plaintext: string): string | null;
}
export const API_KEY_GENERATOR = Symbol('ApiKeyGenerator');
