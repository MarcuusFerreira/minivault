import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import type { PasswordHasher } from '../../../../application/ports/output/password-hasher.port.js';

/** OWASP baseline for Argon2id: 19 MiB, two passes, one lane. */
// 2 is Argon2id; the library declares it as an ambient const enum, unusable with isolatedModules.
const OPTIONS = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export class Argon2PasswordHasher implements PasswordHasher {
  private dummy: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(password: string, stored: string | null): Promise<boolean> {
    this.dummy ??= hash(randomBytes(32), OPTIONS);
    const matches = await verify(stored ?? (await this.dummy), password);
    return stored !== null && matches;
  }
}
