import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/states';
import { projectsQuery } from '@/services/queries';
import { CreateProjectButton } from './create-project-button';
import { ProjectList } from './project-list';

export function Component() {
  const { data, error, isPending, refetch } = useQuery(projectsQuery());
  return (
    <>
      <PageHeader title="Projects">
        <CreateProjectButton />
      </PageHeader>
      {isPending ? (
        <LoadingRows label="Loading projects" />
      ) : data === undefined ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="You have no projects yet." />
      ) : (
        <ProjectList projects={data} />
      )}
    </>
  );
}
