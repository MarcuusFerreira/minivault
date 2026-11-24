import { zodResolver } from '@hookform/resolvers/zod';
import { type RegisterRequest, registerRequest } from '@minivault/contracts';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError, errorMessage } from '@/services/api-client';
import { AuthLayout } from './auth-layout';
import { useSession } from './session';

const PASSWORD_RULE = 'Use between 12 and 128 characters.';

export function Component() {
  const session = useSession();
  const [params] = useSearchParams();
  const { register, handleSubmit, setError, formState } = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequest),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (account) => {
    try {
      await session.register(account);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
        setError('email', { type: 'server', message: 'This email address is already registered.' });
      } else if (error instanceof ApiError && error.status === 429) {
        setError('root', { message: 'Too many attempts. Wait a minute and try again.' });
      } else {
        setError('root', { message: errorMessage(error) });
      }
    }
  });
  const emailError = errors.email && (errors.email.type === 'server' ? errors.email.message : 'Enter a valid email address.');

  return (
    <AuthLayout title="Create account">
      <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
        <Field label="Name" error={errors.name && 'Enter your name, up to 100 characters.'}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Email" error={emailError}>
          <Input type="email" autoComplete="username" spellCheck={false} {...register('email')} />
        </Field>
        <Field label="Password" hint={PASSWORD_RULE} error={errors.password && PASSWORD_RULE}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <FormError>{errors.root?.message}</FormError>
        <Button type="submit" disabled={isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="text-dim">
        Already registered?{' '}
        <Link className="text-ink underline underline-offset-4" to={{ pathname: '/login', search: params.toString() }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
