import type { ProjectResponse } from '@minivault/contracts';
import { Link } from 'react-router';
import { plural } from '@/lib/format';

export function ProjectList({ projects }: { projects: ProjectResponse[] }) {
  return (
    <ul className="border border-line">
      {projects.map((project) => (
        <li
          key={project.id}
          className="relative grid gap-1 border-b border-line p-4 last:border-b-0 hover:bg-raised sm:grid-cols-[1fr_auto] sm:gap-6"
        >
          <div className="min-w-0">
            <Link to={`/projects/${project.id}`} className="font-medium break-words underline-offset-4 after:absolute after:inset-0 hover:underline">
              {project.name}
            </Link>
            {project.description ? <p className="truncate text-dim">{project.description}</p> : null}
          </div>
          <p className="text-dim">
            {plural(project.environmentCount, 'environment')}, {plural(project.secretCount, 'secret')}
          </p>
        </li>
      ))}
    </ul>
  );
}
