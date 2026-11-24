import { ProvisionDefaultEnvironmentsUseCase } from './provision-default-environments/provision-default-environments.use-case.js';

it('creates exactly the three standard environments', async () => {
  const added: string[] = [];
  let id = 0;
  const useCase = new ProvisionDefaultEnvironmentsUseCase(
    {
      add: async (e) => void added.push(`${e.projectId}/${e.name.value}`),
      remove: async () => true,
      find: async () => null,
      findByName: async () => null,
      listByProject: async () => [],
    },
    { publish: async () => {} },
    { next: () => String(id++) },
    { now: () => new Date(0) },
  );
  await useCase.execute({ projectId: 'p1', actor: { userId: 'u', apiKeyId: null, ipAddress: null } });
  expect(added).toEqual(['p1/DEVELOPMENT', 'p1/STAGING', 'p1/PRODUCTION']);
});
