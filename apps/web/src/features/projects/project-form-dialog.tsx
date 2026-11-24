import { zodResolver } from '@hookform/resolvers/zod';
import { type CreateProjectRequest, type ProjectResponse, createProjectRequest } from '@minivault/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { ApiError, api, errorMessage } from '@/services/api-client';

interface Props {
  /** Creates a project when absent. */
  project?: ProjectResponse;
  onClose: () => void;
  onSaved: (project: ProjectResponse) => void;
}

export function ProjectFormDialog({ project, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(createProjectRequest),
    defaultValues: { name: project?.name ?? '', description: project?.description ?? '' },
  });
  const { errors, isSubmitting } = formState;
  const action = project ? 'Save' : 'Create project';

  const submit = handleSubmit(async (body: CreateProjectRequest) => {
    try {
      const saved = project
        ? await api<ProjectResponse>(`/projects/${project.id}`, { method: 'PATCH', body })
        : await api<ProjectResponse>('/projects', { method: 'POST', body });
      queryClient.setQueryData(['projects', saved.id], saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'], exact: true }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
      ]);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PROJECT_NAME_TAKEN') {
        setError('name', { type: 'server', message: 'You already have a project with this name.' });
      } else {
        setError('root', { message: errorMessage(error) });
      }
    }
  });
  const nameError = errors.name && (errors.name.type === 'server' ? errors.name.message : 'Use between 1 and 100 characters.');

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())} title={project ? 'Edit project' : 'Create project'}>
      <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
        <Field label="Name" error={nameError}>
          <Input autoComplete="off" {...register('name')} />
        </Field>
        <Field label="Description" hint="Optional." error={errors.description && 'Use at most 500 characters.'}>
          <Textarea {...register('description')} />
        </Field>
        <FormError>{errors.root?.message}</FormError>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {action}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
