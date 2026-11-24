import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { SecretAccessed, SecretCreated, SecretDeleted, SecretUpdated } from '../../../../shared/domain/events/secret.events.js';
import type { EncryptedValue } from '../value-objects/encrypted-value.vo.js';
import type { SecretKey } from '../value-objects/secret-key.vo.js';

export interface SecretState {
  id: string;
  projectId: string;
  environmentId: string;
  key: SecretKey;
  encryptedValue: EncryptedValue;
  createdAt: Date;
  updatedAt: Date;
}

/** Holds ciphertext only. The key never changes: the ciphertext is bound to this identity. */
export class Secret extends AggregateRoot {
  private constructor(private state: SecretState) {
    super();
  }

  static create(input: {
    id: string;
    projectId: string;
    environmentId: string;
    key: SecretKey;
    value: EncryptedValue;
    now: Date;
  }): Secret {
    const { value, now, ...identity } = input;
    const secret = new Secret({ ...identity, encryptedValue: value, createdAt: now, updatedAt: now });
    secret.record(new SecretCreated(...secret.eventDetails(now)));
    return secret;
  }

  static restore(state: SecretState): Secret {
    return new Secret(state);
  }

  get id(): string {
    return this.state.id;
  }
  get projectId(): string {
    return this.state.projectId;
  }
  get environmentId(): string {
    return this.state.environmentId;
  }
  get key(): SecretKey {
    return this.state.key;
  }
  get encryptedValue(): EncryptedValue {
    return this.state.encryptedValue;
  }
  get createdAt(): Date {
    return this.state.createdAt;
  }
  get updatedAt(): Date {
    return this.state.updatedAt;
  }

  replaceValue(value: EncryptedValue, now: Date): void {
    this.state = { ...this.state, encryptedValue: value, updatedAt: now };
    this.record(new SecretUpdated(...this.eventDetails(now)));
  }

  recordAccess(now: Date): void {
    this.record(new SecretAccessed(...this.eventDetails(now)));
  }

  markDeleted(now: Date): void {
    this.record(new SecretDeleted(...this.eventDetails(now)));
  }

  private eventDetails(now: Date): [string, string, string, string, Date] {
    return [this.projectId, this.environmentId, this.id, this.key.value, now];
  }
}
