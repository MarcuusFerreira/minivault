import type { DomainEvent } from '../../../../../../shared/domain/domain-event.js';
import { ApiKeyCreated, ApiKeyRevoked } from '../../../../../../shared/domain/events/api-key.events.js';
import { EnvironmentCreated, EnvironmentDeleted } from '../../../../../../shared/domain/events/environment.events.js';
import { ProjectCreated, ProjectDeleted, ProjectUpdated } from '../../../../../../shared/domain/events/project.events.js';
import { SecretAccessed, SecretCreated, SecretDeleted, SecretUpdated } from '../../../../../../shared/domain/events/secret.events.js';
import type { Actor } from '../../../../../../shared/domain/principal.js';
import type { RecordAuditEventCommand } from '../../../../application/ports/input/record-audit-event.port.js';

type Action = RecordAuditEventCommand['action'];

const ACTIONS: Readonly<Record<string, Action>> = {
  [ProjectCreated.NAME]: 'PROJECT_CREATED',
  [ProjectUpdated.NAME]: 'PROJECT_UPDATED',
  [ProjectDeleted.NAME]: 'PROJECT_DELETED',
  [EnvironmentCreated.NAME]: 'ENVIRONMENT_CREATED',
  [EnvironmentDeleted.NAME]: 'ENVIRONMENT_DELETED',
  [SecretCreated.NAME]: 'SECRET_CREATED',
  [SecretUpdated.NAME]: 'SECRET_UPDATED',
  [SecretAccessed.NAME]: 'SECRET_ACCESSED',
  [SecretDeleted.NAME]: 'SECRET_DELETED',
  [ApiKeyCreated.NAME]: 'API_KEY_CREATED',
  [ApiKeyRevoked.NAME]: 'API_KEY_REVOKED',
};

export const AUDITED_EVENTS = Object.keys(ACTIONS);

export function toAuditCommand(event: DomainEvent, actor: Actor): RecordAuditEventCommand {
  const action = ACTIONS[event.name];
  if (!action) throw new Error(`Event ${event.name} is not audited`);
  return { action, actor, occurredAt: event.occurredAt, ...describe(event) };
}

function describe(
  event: DomainEvent,
): Pick<RecordAuditEventCommand, 'resourceType' | 'resourceId' | 'projectId' | 'environmentId' | 'metadata'> {
  if (event instanceof ProjectCreated || event instanceof ProjectUpdated || event instanceof ProjectDeleted) {
    const { projectId, projectName } = event;
    return { resourceType: 'PROJECT', resourceId: projectId, projectId, environmentId: null, metadata: { name: projectName } };
  }
  if (event instanceof EnvironmentCreated || event instanceof EnvironmentDeleted) {
    const { projectId, environmentId, environmentName } = event;
    return { resourceType: 'ENVIRONMENT', resourceId: environmentId, projectId, environmentId, metadata: { environmentName } };
  }
  if (
    event instanceof SecretCreated ||
    event instanceof SecretUpdated ||
    event instanceof SecretAccessed ||
    event instanceof SecretDeleted
  ) {
    const { projectId, environmentId, secretId, key } = event;
    return { resourceType: 'SECRET', resourceId: secretId, projectId, environmentId, metadata: { key } };
  }
  if (event instanceof ApiKeyCreated || event instanceof ApiKeyRevoked) {
    const { projectId, apiKeyId, keyName, prefix, grants } = event;
    return {
      resourceType: 'API_KEY',
      resourceId: apiKeyId,
      projectId,
      environmentId: null,
      metadata: { name: keyName, apiKeyPrefix: prefix, grants },
    };
  }
  throw new Error(`Event ${event.name} is not audited`);
}
