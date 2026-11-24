import type { ProjectResponse } from '@minivault/contracts';
import { Link } from 'react-router';
import { plural } from '@/lib/format';

export function ProjectList({ projects }: { projects: ProjectResponse[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <li
          key={project.id}
          className="relative grid content-between gap-6 rounded-3xl bg-raised/60 p-5 transition-colors duration-150 hover:bg-raised"
        >
          <div className="flex min-w-0 items-start gap-4">
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-hover text-lg font-semibold">
              {[...project.name][0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <Link to={`/projects/${project.id}`} className="font-semibold break-words after:absolute after:inset-0 after:rounded-3xl">
                {project.name}
              </Link>
              {project.description ? <p className="line-clamp-2 text-sm text-dim">{project.description}</p> : null}
            </div>
          </div>
          <p className="text-sm text-dim">
            {plural(project.environmentCount, 'environment')}, {plural(project.secretCount, 'secret')}
          </p>
        </li>
      ))}
    </ul>
  );
}
