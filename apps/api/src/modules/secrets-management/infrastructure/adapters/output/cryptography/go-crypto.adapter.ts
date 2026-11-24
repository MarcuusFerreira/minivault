import { z } from 'zod';
import { ApplicationError } from '../../../../../../shared/application/application-error.js';
import { currentCorrelationId } from '../../../../../../shared/infrastructure/http/correlation-id.middleware.js';
import type { EncryptionContext, EncryptionPort } from '../../../../application/ports/output/encryption.port.js';
import { EncryptedValue } from '../../../../domain/value-objects/encrypted-value.vo.js';

export interface GoCryptoOptions {
  baseUrl: string;
  token: string;
  timeoutMs: number;
}

const encryptResponse = z.object({ ciphertext: z.base64(), nonce: z.base64(), keyVersion: z.number() });
const decryptResponse = z.object({ plaintext: z.base64() });

const unavailable = () => new ApplicationError('ENCRYPTION_UNAVAILABLE', 'unavailable', 'Encryption service is unavailable. Try again.');
const integrityFailure = () => new ApplicationError('SECRET_INTEGRITY_FAILURE', 'internal', 'The secret could not be read.');

/**
 * Calls the secrets engine. Original errors are never attached as a cause: a JSON or
 * schema error can quote the payload.
 */
export class GoCryptoAdapter implements EncryptionPort {
  constructor(private readonly options: GoCryptoOptions) {}

  async encrypt(context: EncryptionContext, plaintext: string): Promise<EncryptedValue> {
    const body = { ...pick(context), plaintext: Buffer.from(plaintext, 'utf8').toString('base64') };
    const answer = encryptResponse.safeParse(await this.call('encrypt', body));
    if (!answer.success) throw unavailable();
    try {
      return EncryptedValue.create({
        ciphertext: new Uint8Array(Buffer.from(answer.data.ciphertext, 'base64')),
        nonce: new Uint8Array(Buffer.from(answer.data.nonce, 'base64')),
        keyVersion: answer.data.keyVersion,
      });
    } catch {
      throw unavailable();
    }
  }

  async decrypt(context: EncryptionContext, value: EncryptedValue): Promise<string> {
    const answer = decryptResponse.safeParse(
      await this.call('decrypt', {
        ...pick(context),
        ciphertext: Buffer.from(value.ciphertext).toString('base64'),
        nonce: Buffer.from(value.nonce).toString('base64'),
        keyVersion: value.keyVersion,
      }),
    );
    if (!answer.success) throw unavailable();
    try {
      // Fatal: replacement characters would silently corrupt a secret.
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.from(answer.data.plaintext, 'base64'));
    } catch {
      throw integrityFailure();
    }
  }

  private async call(operation: 'encrypt' | 'decrypt', body: object): Promise<unknown> {
    let status: number;
    try {
      const response = await fetch(`${this.options.baseUrl}/internal/v1/${operation}`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(this.options.timeoutMs),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.token}`,
          'X-Correlation-Id': currentCorrelationId(),
        },
        body: JSON.stringify(body),
      });
      if (response.ok) return await response.json();
      status = response.status;
      await response.body?.cancel();
    } catch {
      throw unavailable();
    }
    throw status === 422 ? integrityFailure() : unavailable();
  }
}

function pick({ projectId, environmentId, secretId }: EncryptionContext): EncryptionContext {
  return { projectId, environmentId, secretId };
}
