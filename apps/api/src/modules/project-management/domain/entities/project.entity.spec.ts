import { ProjectName } from '../value-objects/project-name.vo.js';
import { Project } from './project.entity.js';

const now = new Date(0);
const create = (name = 'Payments', description = '') =>
  Project.create({ id: 'p1', name: ProjectName.create(name), description, ownerId: 'u1', now });

describe('Project', () => {
  it('trims its name', () => {
    expect(create('  Payments ').name.value).toBe('Payments');
  });
  it.each(['', '   ', 'x'.repeat(101)])('rejects the name %j', (name) => {
    expect(() => create(name)).toThrow(expect.objectContaining({ code: 'PROJECT_NAME_INVALID' }));
  });
  it('accepts a description of 500 characters and rejects 501', () => {
    expect(create('a', 'x'.repeat(500)).description).toHaveLength(500);
    expect(() => create('a', 'x'.repeat(501))).toThrow(expect.objectContaining({ code: 'PROJECT_DESCRIPTION_INVALID' }));
  });
  it('records its creation, update and deletion', () => {
    const project = create();
    project.update({ description: 'new' }, new Date(5));
    project.markDeleted(new Date(6));
    expect(project.pullEvents().map((e) => e.name)).toEqual(['ProjectCreated', 'ProjectUpdated', 'ProjectDeleted']);
    expect(project.updatedAt).toEqual(new Date(5));
    expect(project.name.value).toBe('Payments');
  });
  it('knows its owner', () => {
    expect(create().isOwnedBy('u1')).toBe(true);
    expect(create().isOwnedBy('u2')).toBe(false);
  });
});
