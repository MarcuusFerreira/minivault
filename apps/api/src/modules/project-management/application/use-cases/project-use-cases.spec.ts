import type { RequestContext } from '../../../../shared/domain/principal.js';
import { Project } from '../../domain/entities/project.entity.js';
import type { ProjectRepository } from '../../domain/repositories/project.repository.js';
import { ProjectName } from '../../domain/value-objects/project-name.vo.js';
import { AuthorizeProjectAccessUseCase } from './authorize-project-access/authorize-project-access.use-case.js';
import { CreateProjectUseCase } from './create-project/create-project.use-case.js';
import { DeleteProjectUseCase } from './delete-project/delete-project.use-case.js';
import { GetProjectUseCase } from './get-project/get-project.use-case.js';
import { UpdateProjectUseCase } from './update-project/update-project.use-case.js';

const now = new Date(0);
const asUser = (userId: string): RequestContext => ({ principal: { kind: 'user', userId }, ipAddress: '127.0.0.1' });
const asKey = (projectId: string): RequestContext => ({
  principal: { kind: 'apiKey', apiKeyId: 'k', projectId, grants: [] },
  ipAddress: null,
});

function setup() {
  const log: string[] = [];
  const project = Project.create({ id: 'p1', name: ProjectName.create('A'), description: '', ownerId: 'alice', now });
  project.pullEvents();
  const projects: ProjectRepository = {
    add: async () => void log.push('add'),
    save: async () => log.push('save') > 0,
    remove: async () => log.push('remove') > 0,
    findById: async (id) => (id === 'p1' ? project : null),
    listByOwner: async () => [project],
  };
  const unitOfWork = {
    run: async <T>(work: () => Promise<T>): Promise<T> => {
      log.push('begin');
      const result = await work();
      log.push('commit');
      return result;
    },
  };
  const events = { publish: async (list: readonly { name: string }[]) => void log.push(...list.map((e) => e.name)) };
  const statistics = { forOwner: async () => new Map([['p1', { environmentCount: 3, secretCount: 2 }]]) };
  const clock = { now: () => now };
  return { log, projects, unitOfWork, events, statistics, clock };
}

describe('project use cases', () => {
  it('publishes creation inside the transaction', async () => {
    const s = setup();
    const useCase = new CreateProjectUseCase(s.projects, s.unitOfWork, s.events, { next: () => 'p9' }, s.clock);
    const view = await useCase.execute({ context: asUser('alice'), name: 'New', description: '' });
    expect(view.id).toBe('p9');
    expect(s.log).toEqual(['begin', 'add', 'ProjectCreated', 'commit']);
  });

  it('does not let an API key create projects', async () => {
    const s = setup();
    const useCase = new CreateProjectUseCase(s.projects, s.unitOfWork, s.events, { next: () => 'p9' }, s.clock);
    await expect(useCase.execute({ context: asKey('p1'), name: 'New', description: '' })).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it.each([
    ['get', (s: ReturnType<typeof setup>, c: RequestContext) => new GetProjectUseCase(s.projects, s.statistics).execute({ context: c, projectId: 'p1' })],
    ['update', (s: ReturnType<typeof setup>, c: RequestContext) =>
      new UpdateProjectUseCase(s.projects, s.unitOfWork, s.events, s.statistics, s.clock).execute({ context: c, projectId: 'p1', name: 'X' })],
    ['delete', (s: ReturnType<typeof setup>, c: RequestContext) =>
      new DeleteProjectUseCase(s.projects, s.unitOfWork, s.events, s.clock).execute({ context: c, projectId: 'p1' })],
  ])('%s hides the project from everyone but its owner', async (_name, run) => {
    const s = setup();
    await expect(run(s, asUser('bob'))).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND', kind: 'not_found' });
    expect(s.log).not.toContain('save');
    expect(s.log).not.toContain('remove');
    await run(s, asUser('alice'));
  });

  it('authorizes the owner and keys of the project only', async () => {
    const useCase = new AuthorizeProjectAccessUseCase(setup().projects);
    await useCase.execute({ principal: asUser('alice').principal, projectId: 'p1' });
    await useCase.execute({ principal: asKey('p1').principal, projectId: 'p1' });
    for (const [context, projectId] of [[asUser('bob'), 'p1'], [asKey('p2'), 'p1'], [asUser('alice'), 'p2'], [asKey('p2'), 'p2']] as const) {
      await expect(useCase.execute({ principal: context.principal, projectId })).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
    }
  });
});
