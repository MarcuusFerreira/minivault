import { ApiKeyCreated, ApiKeyRevoked } from '../../../../../../shared/domain/events/api-key.events.js';
import { EnvironmentCreated, EnvironmentDeleted } from '../../../../../../shared/domain/events/environment.events.js';
import { ProjectCreated, ProjectDeleted, ProjectUpdated } from '../../../../../../shared/domain/events/project.events.js';
import { SecretAccessed, SecretCreated, SecretDeleted, SecretUpdated } from '../../../../../../shared/domain/events/secret.events.js';
import { AUDITED_EVENTS, toAuditCommand } from './audit-event.mapper.js';

const at = new Date(0);
const actor = { userId: 'u', apiKeyId: null, ipAddress: '10.0.0.1' };

it.each([
  [new ProjectCreated('p', 'u', 'Pay', at), 'PROJECT_CREATED', 'PROJECT', 'p', null],
  [new ProjectUpdated('p', 'u', 'Pay', at), 'PROJECT_UPDATED', 'PROJECT', 'p', null],
  [new ProjectDeleted('p', 'u', 'Pay', at), 'PROJECT_DELETED', 'PROJECT', 'p', null],
  [new EnvironmentCreated('p', 'e', 'STAGING', at), 'ENVIRONMENT_CREATED', 'ENVIRONMENT', 'e', 'e'],
  [new EnvironmentDeleted('p', 'e', 'STAGING', at), 'ENVIRONMENT_DELETED', 'ENVIRONMENT', 'e', 'e'],
  [new SecretCreated('p', 'e', 's', 'K', at), 'SECRET_CREATED', 'SECRET', 's', 'e'],
  [new SecretUpdated('p', 'e', 's', 'K', at), 'SECRET_UPDATED', 'SECRET', 's', 'e'],
  [new SecretAccessed('p', 'e', 's', 'K', at), 'SECRET_ACCESSED', 'SECRET', 's', 'e'],
  [new SecretDeleted('p', 'e', 's', 'K', at), 'SECRET_DELETED', 'SECRET', 's', 'e'],
  [new ApiKeyCreated('p', 'k', 'CI', 'mv_12345678', [], at), 'API_KEY_CREATED', 'API_KEY', 'k', null],
  [new ApiKeyRevoked('p', 'k', 'CI', 'mv_12345678', [], at), 'API_KEY_REVOKED', 'API_KEY', 'k', null],
])('maps %o to %s', (event, action, resourceType, resourceId, environmentId) => {
  expect(AUDITED_EVENTS).toContain(event.name);
  expect(toAuditCommand(event, actor)).toMatchObject({ action, resourceType, resourceId, environmentId, projectId: 'p', actor, occurredAt: at });
});

it('refuses events it does not know', () => {
  expect(() => toAuditCommand({ name: 'Other', occurredAt: at }, actor)).toThrow();
});
