import { createHash, randomBytes } from 'node:crypto';
import type { ApiKeyGenerator } from '../../../../application/ports/output/api-key-generator.port.js';

const SHAPE = /^mv_[A-Za-z0-9_-]{43}$/;
const PREFIX_LENGTH = 11;

/** SHA-256 is enough for 256 random bits: there is nothing to guess, so a slow hash would add only cost. */
export class RandomApiKeyGenerator implements ApiKeyGenerator {
  generate(): { plaintext: string; hash: string; prefix: string } {
    const plaintext = `mv_${randomBytes(32).toString('base64url')}`;
    return { plaintext, hash: digest(plaintext), prefix: plaintext.slice(0, PREFIX_LENGTH) };
  }

  hash(plaintext: string): string | null {
    return SHAPE.test(plaintext) ? digest(plaintext) : null;
  }
}

function digest(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}
