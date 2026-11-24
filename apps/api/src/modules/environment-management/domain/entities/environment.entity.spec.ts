import { EnvironmentName } from '../value-objects/environment-name.vo.js';
import { Environment } from './environment.entity.js';

describe('Environment', () => {
  it.each(['QA', 'development', ''])('rejects the name %j', (name) => {
    expect(() => EnvironmentName.create(name)).toThrow(expect.objectContaining({ code: 'ENVIRONMENT_NAME_INVALID' }));
  });
  it('records creation and deletion', () => {
    const environment = Environment.create({ id: 'e', projectId: 'p', name: EnvironmentName.create('STAGING'), now: new Date(0) });
    environment.markDeleted(new Date(1));
    expect(environment.pullEvents()).toEqual([
      expect.objectContaining({ name: 'EnvironmentCreated', projectId: 'p', environmentId: 'e', environmentName: 'STAGING' }),
      expect.objectContaining({ name: 'EnvironmentDeleted', environmentId: 'e' }),
    ]);
  });
});
