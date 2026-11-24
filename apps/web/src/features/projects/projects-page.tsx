import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { projectsQuery } from '@/services/queries';
export function Component() {
  const { data } = useQuery(projectsQuery());
  return (<><h1>Projects</h1>{data?.map((p) => <Link key={p.id} to={p.id}>{p.name}</Link>)}</>);
}
