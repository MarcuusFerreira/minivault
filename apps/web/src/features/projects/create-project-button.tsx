import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { ProjectFormDialog } from './project-form-dialog';

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Create project
      </Button>
      {open ? (
        <ProjectFormDialog onClose={() => setOpen(false)} onSaved={(project) => void navigate(`/projects/${project.id}`)} />
      ) : null}
    </>
  );
}
