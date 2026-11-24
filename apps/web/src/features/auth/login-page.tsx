import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginRequest, loginRequest } from '@minivault/contracts';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError, errorMessage } from '@/services/api-client';
import { AuthLayout } from './auth-layout';
import { useSession } from './session';

function explain(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'Email or password is incorrect.';
  if (error instanceof ApiError && error.status === 429) return 'Too many attempts. Wait a minute and try again.';
  return errorMessage(error);
}

export function Component() {
  const { login, expired } = useSession();
  const [params] = useSearchParams();
  const { register, handleSubmit, setError, formState } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequest),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (credentials) => {
    try {
      await login(credentials);
    } catch (error) {
      setError('root', { message: explain(error) });
    }
  });

  return (
    <AuthLayout title="Sign in">
      {expired && !errors.root ? (
        <p role="status" className="rounded-2xl bg-raised px-4 py-2.5">
          Your session expired. Sign in again.
        </p>
      ) : null}
      <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
        <Field label="Email" error={errors.email && 'Enter your email address.'}>
          <Input type="email" autoComplete="username" spellCheck={false} {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password && 'Enter your password.'}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <FormError>{errors.root?.message}</FormError>
        <Button type="submit" disabled={isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="text-dim">
        No account?{' '}
        <Link className="text-ink underline underline-offset-4" to={{ pathname: '/register', search: params.toString() }}>
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
